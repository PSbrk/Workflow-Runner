// Workflow validator. Returns { errors: [...], warnings: [...] }.
//
// Errors are blocking (refuse to run):
//   1. Reference integrity: every `next` and every option `goto` must reference
//      an existing step id or "end".
//   2. No auto-infinite loop: a cycle in the routing graph composed only of
//      "wait" steps is illegal — the engine can never break out without user
//      input.
//   (Plus basic schema checks: unique ids, valid types, decisions with options,
//    decisions don't carry `next`.)
//
// Warnings are non-blocking:
//   1. No path to completion: starting from the first step, no traversal of
//      next/goto ever reaches "end" (or a terminal step with no next).
//
// This file is loaded by the browser (via <script>) and also evaluated by
// server.js for startup validation. To support both, it attaches
// `validateWorkflow` to `globalThis`.

(function attachValidator(root) {
  function isStringId(x) { return typeof x === 'string' && x.length > 0; }

  function validateWorkflow(workflow) {
    const errors = [];
    const warnings = [];

    if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
      errors.push({ message: 'Workflow must be a JSON object.' });
      return { errors, warnings };
    }

    if (!isStringId(workflow.id)) {
      errors.push({ message: 'Workflow must have a non-empty string "id".' });
    }
    if (workflow.title !== undefined && typeof workflow.title !== 'string') {
      errors.push({ message: 'Workflow "title" must be a string if present.' });
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      errors.push({ message: 'Workflow must have a non-empty "steps" array.' });
      return { errors, warnings };
    }

    // Schema checks
    const idsSeen = new Set();
    const byId = Object.create(null);
    const indexById = Object.create(null);
    const validTypes = ['action', 'wait', 'decision'];

    workflow.steps.forEach((step, i) => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) {
        errors.push({ stepIndex: i, message: `Step at index ${i} must be an object.` });
        return;
      }
      if (!isStringId(step.id)) {
        errors.push({ stepIndex: i, message: `Step at index ${i} must have a non-empty string "id".` });
        return;
      }
      if (idsSeen.has(step.id)) {
        errors.push({ stepId: step.id, message: `Duplicate step id "${step.id}".` });
      } else {
        idsSeen.add(step.id);
        byId[step.id] = step;
        indexById[step.id] = i;
      }
      if (!validTypes.includes(step.type)) {
        errors.push({ stepId: step.id, message: `Step "${step.id}" has invalid type "${step.type}". Must be one of: action, wait, decision.` });
      }
      if (typeof step.label !== 'string' || step.label.length === 0) {
        errors.push({ stepId: step.id, message: `Step "${step.id}" must have a non-empty string "label".` });
      }
      if (step.type === 'decision') {
        if (!Array.isArray(step.options) || step.options.length === 0) {
          errors.push({ stepId: step.id, message: `Decision "${step.id}" must have a non-empty "options" array.` });
        } else {
          step.options.forEach((opt, oi) => {
            if (!opt || typeof opt !== 'object') {
              errors.push({ stepId: step.id, message: `Decision "${step.id}" option at index ${oi} must be an object.` });
              return;
            }
            if (typeof opt.label !== 'string' || opt.label.length === 0) {
              errors.push({ stepId: step.id, message: `Decision "${step.id}" option at index ${oi} must have a non-empty "label".` });
            }
            if (!isStringId(opt.goto)) {
              errors.push({ stepId: step.id, message: `Decision "${step.id}" option "${opt.label || oi}" must have a string "goto".` });
            }
          });
        }
        if (Object.prototype.hasOwnProperty.call(step, 'next')) {
          errors.push({ stepId: step.id, message: `Decision "${step.id}" must not have a "next" field — decisions route via option goto only.` });
        }
      } else {
        // action or wait
        if (Object.prototype.hasOwnProperty.call(step, 'next') && !isStringId(step.next)) {
          errors.push({ stepId: step.id, message: `Step "${step.id}" "next" must be a string (step id or "end") if present.` });
        }
        if (Object.prototype.hasOwnProperty.call(step, 'options')) {
          errors.push({ stepId: step.id, message: `Only decision steps may have "options" (step "${step.id}" is type "${step.type}").` });
        }
      }
    });

    if (errors.length) return { errors, warnings };

    function defaultNextOf(stepId) {
      const idx = indexById[stepId];
      if (idx + 1 < workflow.steps.length) return workflow.steps[idx + 1].id;
      return 'end';
    }

    function successorsOf(stepId) {
      const step = byId[stepId];
      if (step.type === 'decision') {
        return step.options.map((o) => o.goto);
      }
      if (Object.prototype.hasOwnProperty.call(step, 'next') && step.next !== undefined) {
        return [step.next];
      }
      return [defaultNextOf(stepId)];
    }

    // Reference integrity
    for (const step of workflow.steps) {
      if (step.type === 'decision') {
        step.options.forEach((opt, oi) => {
          if (opt.goto === 'end') return;
          if (!byId[opt.goto]) {
            errors.push({
              stepId: step.id,
              message: `Decision "${step.id}" option "${opt.label || oi}" goto references unknown step id "${opt.goto}".`,
            });
          }
        });
      } else {
        if (Object.prototype.hasOwnProperty.call(step, 'next') && step.next !== undefined) {
          if (step.next !== 'end' && !byId[step.next]) {
            errors.push({
              stepId: step.id,
              message: `Step "${step.id}" "next" references unknown step id "${step.next}".`,
            });
          }
        }
      }
    }

    if (errors.length) return { errors, warnings };

    // Cycle detection via Tarjan's SCC over the routing graph (excluding "end").
    const nodes = workflow.steps.map((s) => s.id);
    const adj = Object.create(null);
    for (const id of nodes) {
      adj[id] = successorsOf(id).filter((t) => t !== 'end');
    }

    const indexMap = Object.create(null);
    const lowlink = Object.create(null);
    const onStack = new Set();
    const stack = [];
    const sccs = [];
    let counter = 0;

    function strongconnect(v) {
      indexMap[v] = counter;
      lowlink[v] = counter;
      counter++;
      stack.push(v);
      onStack.add(v);
      for (const w of adj[v]) {
        if (!(w in indexMap)) {
          strongconnect(w);
          if (lowlink[w] < lowlink[v]) lowlink[v] = lowlink[w];
        } else if (onStack.has(w)) {
          if (indexMap[w] < lowlink[v]) lowlink[v] = indexMap[w];
        }
      }
      if (lowlink[v] === indexMap[v]) {
        const scc = [];
        let w;
        do {
          w = stack.pop();
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);
        sccs.push(scc);
      }
    }

    for (const v of nodes) {
      if (!(v in indexMap)) strongconnect(v);
    }

    for (const scc of sccs) {
      const hasCycle = scc.length > 1 || (scc.length === 1 && adj[scc[0]].includes(scc[0]));
      if (!hasCycle) continue;
      const allWait = scc.every((id) => byId[id].type === 'wait');
      if (allWait) {
        const list = scc.map((s) => `"${s}"`).join(', ');
        errors.push({
          stepIds: scc.slice(),
          message: `Pure-wait loop detected among steps ${list}. Loops must contain at least one "action" or "decision" step so the engine can stop for user input.`,
        });
      }
    }

    if (errors.length) return { errors, warnings };

    // Warning: no path to completion from start.
    const start = workflow.steps[0].id;
    const seen = new Set();
    const queue = [start];
    let reachedEnd = false;
    while (queue.length) {
      const cur = queue.shift();
      if (cur === 'end') { reachedEnd = true; break; }
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const s of successorsOf(cur)) {
        if (s === 'end') { reachedEnd = true; break; }
        if (!seen.has(s)) queue.push(s);
      }
      if (reachedEnd) break;
    }
    if (!reachedEnd) {
      warnings.push({
        message: 'No path from the first step ever reaches "end". The workflow has no completion path — this is allowed (e.g. a stoppable infinite loop) but is often an authoring mistake.',
      });
    }

    return { errors, warnings };
  }

  root.validateWorkflow = validateWorkflow;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
