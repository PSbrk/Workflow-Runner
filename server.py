"""Minimal zero-dependency static server for Workflow Runner.

Serves files from public/ and exposes GET /api/workflows which returns the
parsed contents of every JSON file in workflows/. At startup, validates every
workflow file in workflows/ and prints the result.

Run:  python server.py
"""

import json
import os
import re
import socket
import sys
import threading
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# Workflow ids on disk:  letters/digits + hyphen/underscore, 1–64 chars,
# must start with a letter or digit. The id is also the file stem.
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
# Filenames we accept in DELETE / rename targets (resolved inside WORKFLOWS_DIR).
FILE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,128}\.json$")


def is_valid_id(s):
    return isinstance(s, str) and bool(ID_RE.match(s))


def is_safe_filename(s):
    return isinstance(s, str) and bool(FILE_RE.match(s))

PORT = int(os.environ.get("WORKFLOW_RUNNER_PORT", "5174"))
ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(ROOT, "public")
WORKFLOWS_DIR = os.path.join(ROOT, "workflows")

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".png":  "image/png",
}

# ----------------------------- Workflow I/O ---------------------------------

def read_workflows():
    if not os.path.isdir(WORKFLOWS_DIR):
        return []
    results = []
    for fn in sorted(os.listdir(WORKFLOWS_DIR)):
        if not fn.lower().endswith(".json"):
            continue
        full = os.path.join(WORKFLOWS_DIR, fn)
        try:
            with open(full, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            results.append({"file": fn, "parseError": f"Could not read file: {e}"})
            continue
        try:
            wf = json.loads(content)
            results.append({"file": fn, "workflow": wf})
        except Exception as e:
            results.append({"file": fn, "parseError": str(e)})
    return results

# --------------------------- Workflow validation -----------------------------

VALID_TYPES = ("action", "wait", "decision")


def validate(workflow):
    """Mirror of public/validator.js. Returns {errors, warnings}."""
    errors = []
    warnings = []

    if not isinstance(workflow, dict):
        errors.append({"message": "Workflow must be a JSON object."})
        return {"errors": errors, "warnings": warnings}

    if not isinstance(workflow.get("id"), str) or not workflow.get("id"):
        errors.append({"message": 'Workflow must have a non-empty string "id".'})

    steps = workflow.get("steps")
    if not isinstance(steps, list) or not steps:
        errors.append({"message": 'Workflow must have a non-empty "steps" array.'})
        return {"errors": errors, "warnings": warnings}

    ids_seen = set()
    by_id = {}
    index_by_id = {}

    for i, step in enumerate(steps):
        if not isinstance(step, dict):
            errors.append({"stepIndex": i, "message": f"Step at index {i} must be an object."})
            continue
        sid = step.get("id")
        if not isinstance(sid, str) or not sid:
            errors.append({"stepIndex": i, "message": f'Step at index {i} must have a non-empty string "id".'})
            continue
        if sid in ids_seen:
            errors.append({"stepId": sid, "message": f'Duplicate step id "{sid}".'})
        else:
            ids_seen.add(sid)
            by_id[sid] = step
            index_by_id[sid] = i
        if step.get("type") not in VALID_TYPES:
            errors.append({"stepId": sid, "message": f'Step "{sid}" has invalid type "{step.get("type")}". Must be one of: action, wait, decision.'})
        if not isinstance(step.get("label"), str) or not step.get("label"):
            errors.append({"stepId": sid, "message": f'Step "{sid}" must have a non-empty string "label".'})
        if step.get("type") == "decision":
            options = step.get("options")
            if not isinstance(options, list) or not options:
                errors.append({"stepId": sid, "message": f'Decision "{sid}" must have a non-empty "options" array.'})
            else:
                for oi, opt in enumerate(options):
                    if not isinstance(opt, dict):
                        errors.append({"stepId": sid, "message": f'Decision "{sid}" option at index {oi} must be an object.'})
                        continue
                    if not isinstance(opt.get("label"), str) or not opt.get("label"):
                        errors.append({"stepId": sid, "message": f'Decision "{sid}" option at index {oi} must have a non-empty "label".'})
                    if not isinstance(opt.get("goto"), str) or not opt.get("goto"):
                        errors.append({"stepId": sid, "message": f'Decision "{sid}" option "{opt.get("label", oi)}" must have a string "goto".'})
            if "next" in step:
                errors.append({"stepId": sid, "message": f'Decision "{sid}" must not have a "next" field — decisions route via option goto only.'})
        else:
            if "next" in step and (not isinstance(step["next"], str) or not step["next"]):
                errors.append({"stepId": sid, "message": f'Step "{sid}" "next" must be a string (step id or "end") if present.'})
            if "options" in step:
                errors.append({"stepId": sid, "message": f'Only decision steps may have "options" (step "{sid}" is type "{step.get("type")}").'})

    if errors:
        return {"errors": errors, "warnings": warnings}

    def default_next(sid):
        idx = index_by_id[sid]
        if idx + 1 < len(steps):
            return steps[idx + 1]["id"]
        return "end"

    def successors(sid):
        step = by_id[sid]
        if step["type"] == "decision":
            return [o["goto"] for o in step["options"]]
        if "next" in step and step["next"] is not None:
            return [step["next"]]
        return [default_next(sid)]

    # Reference integrity
    for step in steps:
        sid = step["id"]
        if step["type"] == "decision":
            for oi, opt in enumerate(step["options"]):
                if opt["goto"] == "end":
                    continue
                if opt["goto"] not in by_id:
                    errors.append({
                        "stepId": sid,
                        "message": f'Decision "{sid}" option "{opt.get("label", oi)}" goto references unknown step id "{opt["goto"]}".'
                    })
        else:
            if "next" in step and step["next"] is not None:
                if step["next"] != "end" and step["next"] not in by_id:
                    errors.append({
                        "stepId": sid,
                        "message": f'Step "{sid}" "next" references unknown step id "{step["next"]}".'
                    })
    if errors:
        return {"errors": errors, "warnings": warnings}

    # Tarjan SCC for cycle detection (excluding "end")
    nodes = [s["id"] for s in steps]
    adj = {sid: [t for t in successors(sid) if t != "end"] for sid in nodes}

    index_map = {}
    lowlink = {}
    on_stack = set()
    stack = []
    sccs = []
    counter = [0]

    sys.setrecursionlimit(max(2000, sys.getrecursionlimit()))

    def strongconnect(v):
        index_map[v] = counter[0]
        lowlink[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on_stack.add(v)
        for w in adj[v]:
            if w not in index_map:
                strongconnect(w)
                if lowlink[w] < lowlink[v]:
                    lowlink[v] = lowlink[w]
            elif w in on_stack:
                if index_map[w] < lowlink[v]:
                    lowlink[v] = index_map[w]
        if lowlink[v] == index_map[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack.discard(w)
                scc.append(w)
                if w == v:
                    break
            sccs.append(scc)

    for v in nodes:
        if v not in index_map:
            strongconnect(v)

    for scc in sccs:
        has_cycle = len(scc) > 1 or (len(scc) == 1 and scc[0] in adj[scc[0]])
        if not has_cycle:
            continue
        if all(by_id[s]["type"] == "wait" for s in scc):
            list_str = ", ".join(f'"{s}"' for s in scc)
            errors.append({
                "stepIds": list(scc),
                "message": f'Pure-wait loop detected among steps {list_str}. Loops must contain at least one "action" or "decision" step so the engine can stop for user input.'
            })

    if errors:
        return {"errors": errors, "warnings": warnings}

    # Warning: no path to completion
    start = steps[0]["id"]
    seen = set()
    queue = [start]
    reached_end = False
    while queue:
        cur = queue.pop(0)
        if cur == "end":
            reached_end = True
            break
        if cur in seen:
            continue
        seen.add(cur)
        for s in successors(cur):
            if s == "end":
                reached_end = True
                break
            if s not in seen:
                queue.append(s)
        if reached_end:
            break

    if not reached_end:
        warnings.append({
            "message": 'No path from the first step ever reaches "end". The workflow has no completion path — this is allowed (e.g. a stoppable infinite loop) but is often an authoring mistake.'
        })

    return {"errors": errors, "warnings": warnings}


def startup_validate(results):
    if not results:
        print("[startup] No workflows found in workflows/.", flush=True)
        return
    print(f"[startup] Validating {len(results)} workflow file(s):", flush=True)
    for r in results:
        if "parseError" in r:
            print(f"  [PARSE] {r['file']} — {r['parseError']}")
            continue
        wf = r["workflow"]
        v = validate(wf)
        if v["errors"]:
            tag = "ERROR"
        elif v["warnings"]:
            tag = "WARN "
        else:
            tag = "OK   "
        wfid = wf.get("id", "?") if isinstance(wf, dict) else "?"
        print(f"  [{tag}] {r['file']} (id=\"{wfid}\")")
        for e in v["errors"]:
            print(f"          error: {e['message']}")
        for w in v["warnings"]:
            print(f"          warn:  {w['message']}")

# ------------------------------- HTTP ---------------------------------------

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Compact one-line access log to stderr.
        sys.stderr.write("%s - %s\n" % (self.command, self.path))

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/workflows":
            self._send_json(200, {"workflows": read_workflows()})
            return
        if path == "/":
            path = "/index.html"
        rel = path.lstrip("/")
        target = os.path.normpath(os.path.join(PUBLIC_DIR, rel))
        if not (target == PUBLIC_DIR or target.startswith(PUBLIC_DIR + os.sep)):
            self._send(403, b"Forbidden")
            return
        if not os.path.isfile(target):
            self._send(404, b"Not Found")
            return
        ext = os.path.splitext(target)[1].lower()
        ctype = MIME.get(ext, "application/octet-stream")
        try:
            with open(target, "rb") as f:
                data = f.read()
        except Exception:
            self._send(500, b"Read error")
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            length = 0
        if length <= 0:
            return None, "Empty body"
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8")), None
        except Exception as e:
            return None, f"Bad JSON: {e}"

    def do_POST(self):
        # POST /api/workflows — create or update.
        # Body: { workflow: {...}, originalFile?: "<old.json>" }
        # If originalFile is supplied and differs from the new file, the old
        # file is removed (rename).
        path = self.path.split("?", 1)[0]
        if path != "/api/workflows":
            self._send(404, b"Not Found")
            return
        data, err = self._read_json_body()
        if err:
            self._send_json(400, {"error": err})
            return
        if not isinstance(data, dict):
            self._send_json(400, {"error": "Body must be a JSON object."})
            return
        workflow = data.get("workflow")
        original_file = data.get("originalFile")
        if not isinstance(workflow, dict):
            self._send_json(400, {"error": '"workflow" must be an object.'})
            return
        new_id = workflow.get("id")
        if not is_valid_id(new_id):
            self._send_json(400, {
                "error": 'workflow.id must be 1–64 chars: letters, digits, hyphen, underscore (and must start with a letter or digit).'
            })
            return
        v = validate(workflow)
        if v["errors"]:
            self._send_json(400, {"error": "Validation failed", "validation": v})
            return

        new_file = f"{new_id}.json"
        os.makedirs(WORKFLOWS_DIR, exist_ok=True)
        target = os.path.join(WORKFLOWS_DIR, new_file)

        # Collision: refuse to overwrite an existing file unless this save is
        # specifically updating it (originalFile == new_file).
        if original_file != new_file and os.path.isfile(target):
            self._send_json(409, {
                "error": f'A workflow file "{new_file}" already exists. Choose a different id.',
                "conflict": new_file,
            })
            return

        try:
            tmp = target + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(workflow, f, indent=2, ensure_ascii=False)
                f.write("\n")
            os.replace(tmp, target)
        except Exception as e:
            self._send_json(500, {"error": f"Could not write file: {e}"})
            return

        # Rename: drop the previous file if the user changed the id.
        if original_file and original_file != new_file and is_safe_filename(original_file):
            old = os.path.join(WORKFLOWS_DIR, original_file)
            try:
                if os.path.isfile(old):
                    os.remove(old)
            except Exception:
                pass

        self._send_json(200, {
            "ok": True,
            "file": new_file,
            "workflow": workflow,
            "validation": v,
        })

    def do_DELETE(self):
        # DELETE /api/workflows/<filename.json>
        path = self.path.split("?", 1)[0]
        m = re.match(r"^/api/workflows/([^/]+)$", path)
        if not m:
            self._send(404, b"Not Found")
            return
        fname = m.group(1)
        if not is_safe_filename(fname):
            self._send_json(400, {"error": "Invalid filename."})
            return
        target = os.path.join(WORKFLOWS_DIR, fname)
        # Defence in depth: ensure path stays inside WORKFLOWS_DIR.
        if not os.path.abspath(target).startswith(os.path.abspath(WORKFLOWS_DIR) + os.sep):
            self._send_json(400, {"error": "Invalid path."})
            return
        if os.path.isfile(target):
            try:
                os.remove(target)
            except Exception as e:
                self._send_json(500, {"error": f"Could not delete: {e}"})
                return
        self._send_json(200, {"ok": True, "file": fname})


def find_free_port(preferred):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", preferred))
        s.close()
        return preferred
    except OSError:
        s.close()
        for p in range(preferred + 1, preferred + 50):
            s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                s2.bind(("127.0.0.1", p))
                s2.close()
                return p
            except OSError:
                s2.close()
                continue
        raise RuntimeError("No free port available near %d" % preferred)


def main():
    args = sys.argv[1:]
    open_browser = "--open" in args or "-o" in args

    results = read_workflows()
    startup_validate(results)
    port = find_free_port(PORT)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True
    url = f"http://localhost:{port}"
    print(f"\nWorkflow Runner running at {url}\n", flush=True)

    if open_browser:
        # Open the default browser once the listener is actually accepting.
        def _open():
            try:
                webbrowser.open(url, new=2)
            except Exception:
                pass
        threading.Timer(0.4, _open).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
