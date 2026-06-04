# Workflow Runner

A local web app that turns a JSON description of a process into a clickable
chain of boxes. Drop a `workflows/<id>.json` file in, refresh, and step through
your process: click the current step to mark it done, pick options on decision
steps to branch, and let loop-backs reset a segment when you re-enter it.

Two ways to get a workflow into the app:

1. **Have Claude write one for you.** Describe the process in plain language;
   Claude writes a `workflows/<id>.json` file matching the schema in this
   README. Reload and run it.
2. **Build it yourself in the app.** Click **+ New** (or **Edit** on an
   existing workflow) — the built-in editor gives you a form-based step list
   on the left and a live diagram on the right. Save writes the JSON file to
   disk for you, with file renames handled when you change the id.

---

## Run it

```
python server.py
```

(Or double-click **`start.cmd`** on Windows.)

That prints a local URL like `http://localhost:5174`. Open it in a modern
desktop browser. No build step, no dependencies, no network required — just
the Python 3 stdlib.

The server also validates every file in `workflows/` at startup and prints the
result in the terminal. The same validation also runs in the browser when the
app loads — the picker shows a warning badge next to any file with errors or
warnings, and the selected workflow's full validation appears as banners
above the canvas.

---

## How a run feels — flashcard view

The runner shows **one card at a time** — whatever's waiting for your input
right now. Around it:

- **Trail** above the card: a compact breadcrumb of recent steps. Done steps
  appear as green pills; the wait-steps the engine walked through to reach the
  current card show as amber `⏸ <id>` pills; the current step is the blue
  pill with `▶`.
- **The card**:
  - For an `action`: a big **"Click to complete"** button.
  - For a `decision`: one button per option, with the full option text.
  - If the engine had to traverse `wait` steps to reach the card, a small
    "While waiting for: …" notice on the card surfaces what's pending.
- **Progress** below the card: `X of Y steps completed` plus a progress bar.
- When the workflow reaches `end`, the card flips to a green **"✓ Workflow
  complete"** card with a **"Run again"** button.

Progress is saved per workflow in `localStorage`. **"Reset workflow"** in the
header clears it for the current workflow. Closing the browser and reopening
keeps you where you were.

---

## Building & editing in the app

Header buttons:

- **+ New** — opens the editor on a fresh workflow with one stub step.
- **Edit** — opens the editor on the currently-selected workflow.

The editor has three tabs (Canvas is the default):

- **Canvas** — drag-and-drop visual editor.
  - **Shape palette** at the top adds steps: square = action, circle =
    decision, diamond = wait.
  - **Drag a shape's body** to move it. Positions are persisted as
    `position: {x, y}` on each step.
  - **Hover a shape** to reveal the **+** handle below it and the **✕**
    handle in the top-right corner. Drag **+** to another shape (or to the
    green END node) to create a connection. Click **✕** to delete the
    shape.
  - **Auto type-conversion**: when you add a second outgoing connection to
    an Action, the app prompts you for option labels and auto-converts the
    Action into a Decision. Wait shapes are limited to one outgoing
    connection.
  - **Click an edge** to select it, then press **Delete** to remove it.
    Deleting the second-to-last edge on a Decision offers to convert it
    back to an Action.
  - **Double-click a shape's label** (or the shape body) to edit it
    inline. Double-click the **id** text to rename the step — all `next`
    and `goto` references update automatically.
  - **END node** is a fixed terminator (draggable). Any `next` or option
    `goto` of `"end"` draws an arrow to it.
- **Form** — each step is a card with ID, type, label, and a routing row
  (a *Next* dropdown for Action/Wait, or an *Options* list for Decision).
  Step cards have *↑* / *↓* buttons to reorder and *✕* to delete.
- **Raw JSON** — edit the workflow JSON directly. Live parse status;
  switching tabs applies the latest text.

While **Canvas** is active, the read-only Preview pane is hidden (the
canvas is itself the visual editor). Form and Raw JSON tabs show the live
preview on the right.

Live validation runs as you edit (same rules as the runner). Errors are
listed in a red panel under the ID/Title fields and **disable the Save
button** until fixed; warnings appear in yellow but don't block save.

Editor actions:

- **Save** — writes `workflows/<id>.json`. If you changed the id, the
  previous file is removed (the workflow is renamed on disk). Refuses on
  validation errors or on id collisions with another existing file.
- **Save as new…** — prompts for a new id and saves a copy without
  touching the original (duplicate).
- **Cancel** — discards changes and returns to the runner.
- **Delete workflow** — confirmation prompt, then removes the JSON file.

When you change a step's id in the Form view, every `next` and option
`goto` that referenced the old id is automatically rewritten to the new id
so existing routing stays intact. Steps whose target was deleted (and any
other broken references) show as **"⚠ broken reference"** in the routing
dropdown so you can spot them.

### Pill states in the trail

| State    | Visual                | Meaning                                                  |
|----------|----------------------|----------------------------------------------------------|
| done     | green pill            | completed; for a decision shows `s5 → Yes`               |
| waiting  | amber `⏸ <id>`        | a `wait` step the engine walked through to reach the card |
| current  | blue `▶ <id>`         | the active step the card represents                      |

Progress is saved per workflow in `localStorage`.

---

## The JSON schema

Each workflow lives in `workflows/<id>.json`:

```json
{
  "id": "<unique-id>",
  "title": "<display title>",
  "steps": [ ... ]
}
```

### Step types

There are **three** step types:

**`action`** — clickable. You complete it by clicking it.
```json
{ "id": "s2", "type": "action", "label": "Email the vendor" }
{ "id": "s2", "type": "action", "label": "Email the vendor", "next": "s5" }
```

**`wait`** — passive. The engine passes through it on the way to the next
clickable step. Marked **waiting** while pending, **done** when the next
action/decision after it is completed.
```json
{ "id": "s3", "type": "wait", "label": "Wait for vendor to respond" }
{ "id": "s3", "type": "wait", "label": "Wait for vendor to respond", "next": "s4" }
```

**`decision`** — presents selectable options; each option points to a step.
A decision has **no** `next` — routing is per option only.
```json
{
  "id": "s5",
  "type": "decision",
  "label": "Does the vendor accept the renewal terms as-is?",
  "options": [
    { "label": "Yes", "goto": "s6" },
    { "label": "No",  "goto": "s7" }
  ]
}
```

### Routing rules (how "the next step" is determined)

- **Default**: the next step is the next item in the array.
  ```json
  [
    { "id": "a", "type": "action", "label": "..." },
    { "id": "b", "type": "action", "label": "..." }   // a → b by default
  ]
  ```
- An `action` or `wait` step may set `"next": "<stepId>"` to override the
  default, or `"next": "end"` to terminate that path.
- A `decision` step has **no default next**. Each option provides
  `"goto": "<stepId>"` (or `"end"`).
- A `next` or `goto` may target an **earlier** step — that's a loop. The app
  draws loop-back arrows so you can see them.
- Branches may reconverge — different `next`/`goto` targets can land on the
  same step.
- Give a branch's last step an explicit `"next"` when it should not fall
  through to the next array item. (Otherwise you'll get the default — which
  may or may not be what you want.)

### Loop behavior (re-running a segment)

When you advance to a step that you have already completed during this run,
the app:

1. **Truncates** the trail at that target step.
2. Resets every step that was completed or skipped after it back to
   **pending**.
3. **Clears decision choices** within the looped segment.
4. Makes the target step the new active step.

Steps before the loop target keep their state. The example workflow's "No"
branch (`s7 → s3`) demonstrates this: choosing "No" sends you back to wait for
the vendor again, and you re-do `s4`, `s5`, …

---

## Validation

Every workflow is validated when it loads, and the server also validates
everything in `workflows/` at startup and prints the results in the console.

### Errors (BLOCKING — workflow refuses to run)

The app names the offending step ids and the rule that was broken, and will
not let you step through the workflow.

1. **Reference integrity.** Every `next` and every option `goto` must
   reference an existing step id or the literal string `"end"`.
2. **No auto-infinite loop.** Every loop (a directed cycle formed by
   `next` + `goto` links) **must contain at least one `action` or
   `decision` step**. A cycle composed only of `wait` steps would let the
   engine spin forever without ever stopping for user input. Such a workflow
   is rejected.

   *Why:* `action` and `decision` steps require user input each lap (and a
   decision can route out), so those loops are stoppable. A pure-wait loop
   can never be interrupted.

   Illegal:
   ```json
   { "id": "w1", "type": "wait", "label": "...", "next": "w2" }
   { "id": "w2", "type": "wait", "label": "...", "next": "w1" }
   ```
   Legal — the action makes the loop stoppable:
   ```json
   { "id": "w1", "type": "wait",   "label": "Wait" }
   { "id": "a1", "type": "action", "label": "Tap to check", "next": "w1" }
   ```

The app also rejects basic schema mistakes: duplicate step ids, missing
labels, decisions without options, decisions that carry a `next`, etc.

### Warnings (non-blocking — workflow still runs)

A warning banner is shown listing the issue so you can decide whether it's
intended.

1. **No path to completion.** Starting from the first step and following all
   routing options/branches, if **no** reachable path ever ends at `"end"`
   (or a terminal step with no next), the app warns that the workflow can
   never reach completion. This is allowed (a decision that always loops
   back is a valid, stoppable loop) but is often an authoring mistake — a
   missing "Yes → end" exit.

### Defensive guard

The internal routine that walks forward over consecutive `wait` steps to
find the active step refuses to revisit a step in a single walk and surfaces
an error rather than spin. Validation should make this unreachable, but the
guard is there anyway.

---

## Example: `workflows/ica-renewal.json`

This is the example shipped with the app. The "No" branch (`s7`) sets
`"next": "s3"`, sending the flow back to wait for the vendor again until the
user picks "Yes":

```json
{
  "id": "ica-renewal",
  "title": "ICA Renewal",
  "steps": [
    { "id": "s1", "type": "action",   "label": "Receive email from PM requesting ICA renewal" },
    { "id": "s2", "type": "action",   "label": "Email vendor using information provided by PM" },
    { "id": "s3", "type": "wait",     "label": "Wait for vendor to respond" },
    { "id": "s4", "type": "action",   "label": "Review vendor response" },
    { "id": "s5", "type": "decision", "label": "Does the vendor accept the renewal terms as-is?",
      "options": [
        { "label": "Yes", "goto": "s6" },
        { "label": "No",  "goto": "s7" }
      ] },
    { "id": "s6", "type": "action", "label": "Send finalized ICA to PM for signature", "next": "end" },
    { "id": "s7", "type": "action", "label": "Send counter-terms to vendor",           "next": "s3" }
  ]
}
```

---

## For Claude (authoring a new workflow)

When the user describes a process in plain language, write a new
`workflows/<id>.json` file using the schema above. Before saving, mentally
check:

- Every `next` and every option `goto` references a real step id or `"end"`.
- Decisions have an `options` array and no `next`.
- For each loop you introduce (a `next`/`goto` pointing to an earlier step),
  at least one of the steps in that cycle is an `action` or `decision` — not
  all `wait`. Otherwise the app will refuse to run it.
- At least one path leads to `"end"` (or be intentional about a "loop until
  picked" workflow — the warning is OK if intended).
- The first step in the array is the starting step.

Drop the file in `workflows/`. The user clicks "Reload files" (or restarts the
server) and the new workflow appears in the picker.

---

## File layout

```
WorkflowRunner/
├── server.py                    # stdlib-only static server, /api/workflows
├── start.cmd                    # Windows convenience launcher
├── README.md
├── workflows/
│   └── ica-renewal.json         # example
└── public/
    ├── index.html
    ├── styles.css
    ├── validator.js             # browser validator (mirrored by server.py)
    ├── app.js                   # flashcard runner: walk, click, persist
    ├── editor.js                # form + raw-JSON editor with live preview
    └── editor-canvas.js         # drag-drop visual editor (Canvas tab)
```

### Optional step fields persisted by the canvas editor

Beyond the schema required by the validator, the canvas editor stores two
extra fields so the diagram round-trips on disk:

- `step.position = { x, y }` — pixel coordinates (centre of the shape) on
  the editor canvas.
- `workflow.endPosition = { x, y }` — position of the END terminator.

Workflows without these fields still load fine; the canvas auto-arranges
missing positions in flow order on first edit.

### Server endpoints

| Method | URL                          | Purpose                                          |
|-------:|------------------------------|--------------------------------------------------|
| GET    | `/api/workflows`             | List every JSON file in `workflows/`             |
| POST   | `/api/workflows`             | Create or update — body: `{workflow, originalFile?}`. If `originalFile` is supplied and differs from `<workflow.id>.json`, the old file is removed (rename). |
| DELETE | `/api/workflows/<file.json>` | Remove that file                                 |
