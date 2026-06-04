// Workflow Runner — main client.
//
// State per workflow (persisted in localStorage):
//   { trail: [stepId, ...], choices: { [stepId]: optionLabel }, cursor: stepId|"end" }
//
// `cursor` is the position the engine walks forward from. Walking through any
// consecutive "wait" steps it lands on the first "action" or "decision" — that
// is the *active* step. Steps walked past on the way are *waiting*.
//
// On completing the active action (or choosing a decision option), the waits
// passed and the active step are appended to the trail. The cursor advances to
// the next routing target. If that target is already in the trail, the trail is
// truncated at it (loop reset) — every step removed goes back to pending and
// its recorded decision choice is cleared.

const els = {
  select:        document.getElementById('wf-select'),
  newBtn:        document.getElementById('new-btn'),
  editBtn:       document.getElementById('edit-btn'),
  resetBtn:      document.getElementById('reset-btn'),
  reloadBtn:     document.getElementById('reload-btn'),
  statusBar:     document.getElementById('status-bar'),
  errorsBar:     document.getElementById('errors-bar'),
  warningsBar:   document.getElementById('warnings-bar'),
  runTitle:      document.getElementById('run-title'),
  runTrail:      document.getElementById('run-trail'),
  flashcard:     document.getElementById('flashcard'),
  runProgress:   document.getElementById('run-progress'),
};

let allWorkflows = []; // [{ file, workflow?, parseError?, validation? }]
let currentEntry = null; // entry from allWorkflows
let currentWorkflow = null; // currentEntry.workflow with derived helpers
let state = null; // { trail, choices, cursor }

const LS_PREFIX = 'wfr:';

// (Diagram layout constants were removed with the diagram renderer.)

// ---------- Init ----------
init();

async function init() {
  els.select.addEventListener('change', onSelectChange);
  els.resetBtn.addEventListener('click', onReset);
  els.reloadBtn.addEventListener('click', () => loadAll());
  els.newBtn.addEventListener('click', onNew);
  els.editBtn.addEventListener('click', onEdit);
  await loadAll();
}

function onNew() {
  if (globalThis.WfrEditor) globalThis.WfrEditor.enterNew();
}

function onEdit() {
  if (!currentEntry) return;
  if (!globalThis.WfrEditor) return;
  // If the file failed to parse, give the editor the raw text via a stub.
  if (currentEntry.parseError || !currentEntry.workflow) {
    if (!confirm(`"${currentEntry.file}" failed to parse. Open a blank editor instead?`)) return;
    globalThis.WfrEditor.enterNew();
    return;
  }
  globalThis.WfrEditor.enterEdit(currentEntry.workflow, currentEntry.file);
}

// Exposed to the editor for cross-module coordination.
globalThis.WfrApp = {
  getKnownIds: () => allWorkflows.filter((e) => e.workflow && e.workflow.id).map((e) => e.workflow.id),
  getFileForId: (id) => {
    const m = allWorkflows.find((e) => e.workflow && e.workflow.id === id);
    return m ? m.file : null;
  },
  refresh: (preferId) => loadAll(preferId),
};

async function loadAll(preferId) {
  let data;
  try {
    const res = await fetch('/api/workflows', { cache: 'no-store' });
    data = await res.json();
  } catch (e) {
    showStatus(`Could not load workflows: ${e.message}`, 'error');
    return;
  }
  const entries = (data.workflows || []).map((entry) => {
    if (entry.parseError) {
      return { ...entry, validation: { errors: [{ message: `JSON parse error: ${entry.parseError}` }], warnings: [] } };
    }
    const v = validateWorkflow(entry.workflow);
    return { ...entry, validation: v };
  });
  allWorkflows = entries;

  // Populate the selector.
  const prevValue = els.select.value;
  els.select.innerHTML = '';
  if (entries.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no workflows in workflows/)';
    els.select.appendChild(opt);
    currentEntry = null;
    currentWorkflow = null;
    render();
    showSummary();
    return;
  }
  for (const e of entries) {
    const opt = document.createElement('option');
    const id = (e.workflow && e.workflow.id) || e.file;
    const title = (e.workflow && e.workflow.title) || id;
    opt.value = id;
    const badge = e.validation.errors.length ? ' ⚠ errors' : (e.validation.warnings.length ? ' ⚠ warnings' : '');
    opt.textContent = `${title}${badge}`;
    els.select.appendChild(opt);
  }
  // Selection priority: explicit preferId arg → previous value → first runnable → first.
  const has = (id) => entries.some((e) => e.workflow && e.workflow.id === id);
  const firstRunnable = entries.find((e) => e.workflow && !e.validation.errors.length);
  const fallback = (firstRunnable && firstRunnable.workflow.id) || (entries[0].workflow && entries[0].workflow.id) || entries[0].file;
  const target = (preferId && has(preferId)) ? preferId
                : (prevValue && has(prevValue)) ? prevValue
                : fallback;
  els.select.value = target;
  selectWorkflow(target);
  showSummary();
}

function showSummary() {
  // Top status bar: shows overall picture across all workflows.
  if (allWorkflows.length === 0) {
    showStatus('No workflows found in workflows/. Drop a JSON file there and click "Reload files".', 'ok');
    return;
  }
  const bad = allWorkflows.filter((e) => e.validation.errors.length).length;
  const warn = allWorkflows.filter((e) => !e.validation.errors.length && e.validation.warnings.length).length;
  const ok = allWorkflows.length - bad - warn;
  showStatus(`${allWorkflows.length} workflow file(s): ${ok} ok, ${warn} with warnings, ${bad} with errors.`, 'ok');
}

function showStatus(message, _kind) {
  els.statusBar.textContent = message;
  els.statusBar.classList.remove('hidden');
}

// ---------- Workflow selection ----------
function onSelectChange() {
  selectWorkflow(els.select.value);
}

function selectWorkflow(idOrFile) {
  currentEntry = allWorkflows.find((e) => (e.workflow && e.workflow.id === idOrFile) || e.file === idOrFile) || null;
  if (!currentEntry) {
    currentWorkflow = null;
    render();
    return;
  }
  if (currentEntry.parseError || !currentEntry.workflow) {
    currentWorkflow = null;
    renderErrorsWarnings();
    render();
    return;
  }
  currentWorkflow = decorateWorkflow(currentEntry.workflow);
  state = loadState(currentWorkflow.id) || initialState(currentWorkflow);
  renderErrorsWarnings();
  render();
}

function decorateWorkflow(wf) {
  const byId = Object.create(null);
  const indexById = Object.create(null);
  wf.steps.forEach((s, i) => { byId[s.id] = s; indexById[s.id] = i; });
  return Object.assign({}, wf, { byId, indexById });
}

function initialState(wf) {
  return { trail: [], choices: {}, cursor: wf.steps[0].id };
}

function loadState(id) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.trail) || typeof parsed.choices !== 'object' || (typeof parsed.cursor !== 'string' && parsed.cursor !== null)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveState() {
  if (!currentWorkflow || !state) return;
  try {
    localStorage.setItem(LS_PREFIX + currentWorkflow.id, JSON.stringify(state));
  } catch (e) {
    // ignore quota errors
  }
}

function onReset() {
  if (!currentWorkflow) return;
  state = initialState(currentWorkflow);
  saveState();
  render();
}

// ---------- Validation banners ----------
function renderErrorsWarnings() {
  els.errorsBar.classList.add('hidden');
  els.warningsBar.classList.add('hidden');
  els.errorsBar.innerHTML = '';
  els.warningsBar.innerHTML = '';
  if (!currentEntry) return;
  const v = currentEntry.validation;
  if (v.errors.length) {
    const items = v.errors.map(formatIssue).join('');
    els.errorsBar.innerHTML = `<strong>This workflow has errors and cannot be run.</strong><ul>${items}</ul>`;
    els.errorsBar.classList.remove('hidden');
  }
  if (v.warnings.length) {
    const items = v.warnings.map(formatIssue).join('');
    els.warningsBar.innerHTML = `<strong>Warnings:</strong><ul>${items}</ul>`;
    els.warningsBar.classList.remove('hidden');
  }
}

function formatIssue(issue) {
  let ref = '';
  if (issue.stepId) ref = ` <code>${escapeHtml(issue.stepId)}</code>:`;
  else if (Array.isArray(issue.stepIds) && issue.stepIds.length) ref = ` <code>${issue.stepIds.map(escapeHtml).join(', ')}</code>:`;
  return `<li>${ref ? ref + ' ' : ''}${escapeHtml(issue.message)}</li>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Routing helpers ----------
function defaultNextOf(stepId) {
  const idx = currentWorkflow.indexById[stepId];
  if (idx + 1 < currentWorkflow.steps.length) return currentWorkflow.steps[idx + 1].id;
  return 'end';
}

function singleNextOf(stepId) {
  const step = currentWorkflow.byId[stepId];
  if (step.type === 'decision') {
    throw new Error(`singleNextOf called on decision step "${stepId}"`);
  }
  if (Object.prototype.hasOwnProperty.call(step, 'next') && step.next !== undefined) return step.next;
  return defaultNextOf(stepId);
}

function successorsOf(stepId) {
  const step = currentWorkflow.byId[stepId];
  if (step.type === 'decision') return step.options.map((o) => o.goto);
  return [singleNextOf(stepId)];
}

// Walk forward from cursor through consecutive wait steps. Returns the first
// action/decision step encountered (the "active" step), or null if we hit
// "end" before any. Throws on revisit (defensive guard).
function walkActive(cursor) {
  const visited = new Set();
  const waitsPassed = [];
  let cur = cursor;
  while (true) {
    if (cur === 'end' || cur == null) return { active: null, waitsPassed };
    if (visited.has(cur)) {
      throw new Error(`Defensive guard: forward walk revisits step "${cur}". This should have been caught by validation.`);
    }
    visited.add(cur);
    const step = currentWorkflow.byId[cur];
    if (!step) throw new Error(`Walk references unknown step "${cur}".`);
    if (step.type === 'action' || step.type === 'decision') {
      return { active: cur, waitsPassed };
    }
    waitsPassed.push(cur);
    cur = singleNextOf(cur);
  }
}

// Forward reachable set from a starting cursor (used to mark pending vs skipped).
function reachableFrom(cursor) {
  const out = new Set();
  if (!cursor || cursor === 'end') return out;
  const stack = [cursor];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === 'end') continue;
    if (out.has(cur)) continue;
    out.add(cur);
    for (const s of successorsOf(cur)) {
      if (s !== 'end' && !out.has(s)) stack.push(s);
    }
  }
  return out;
}

// ---------- Step interaction ----------
function onCompleteAction(stepId) {
  let walk;
  try {
    walk = walkActive(state.cursor);
  } catch (e) {
    flashError(e.message);
    return;
  }
  if (walk.active !== stepId) return;
  const next = singleNextOf(stepId);
  advance([...walk.waitsPassed, stepId], null, next);
}

function onChooseOption(stepId, optionLabel) {
  let walk;
  try {
    walk = walkActive(state.cursor);
  } catch (e) {
    flashError(e.message);
    return;
  }
  if (walk.active !== stepId) return;
  const step = currentWorkflow.byId[stepId];
  const option = step.options.find((o) => o.label === optionLabel);
  if (!option) return;
  advance([...walk.waitsPassed, stepId], { stepId, label: optionLabel }, option.goto);
}

function advance(newlyDone, choiceEntry, nextCursor) {
  // Append newly-done step ids to the trail (dedupe defensively against the trail's tail).
  let trail = state.trail.slice();
  for (const id of newlyDone) {
    if (trail[trail.length - 1] !== id) trail.push(id);
  }
  let choices = Object.assign({}, state.choices);
  if (choiceEntry) choices[choiceEntry.stepId] = choiceEntry.label;

  // Loop reset: if nextCursor is already in the trail, truncate from there.
  if (nextCursor !== 'end' && trail.includes(nextCursor)) {
    const idx = trail.indexOf(nextCursor);
    const removed = trail.slice(idx);
    trail = trail.slice(0, idx);
    for (const id of removed) {
      if (choices[id] !== undefined) delete choices[id];
    }
  }

  state = { trail, choices, cursor: nextCursor };
  saveState();
  render();
}

function flashError(msg) {
  els.errorsBar.innerHTML = `<strong>Runtime error:</strong> ${escapeHtml(msg)}`;
  els.errorsBar.classList.remove('hidden');
}

// ---------- Render (flashcard runner) ----------
//
// The runner shows a single focused card at a time — the active action or
// decision — surrounded by a compact breadcrumb trail (recent done steps and
// any wait-steps currently being passed through) and a progress counter. Wait
// steps are not their own card; they appear in the trail with an amber pill.

function render() {
  // Clear all panes.
  els.runTitle.textContent = '';
  els.runTrail.innerHTML = '';
  els.flashcard.innerHTML = '';
  els.runProgress.innerHTML = '';
  els.flashcard.className = 'flashcard';

  // Empty / parse-error / unselected.
  if (!currentWorkflow) {
    els.flashcard.classList.add('empty-card');
    if (currentEntry && currentEntry.parseError) {
      els.flashcard.textContent = `Could not parse "${currentEntry.file}": ${currentEntry.parseError}`;
    } else if (allWorkflows.length === 0) {
      els.flashcard.textContent = 'No workflow JSON files yet. Click "+ New" to create one, or drop a JSON file into workflows/ and click Reload.';
    } else {
      els.flashcard.textContent = 'Select a workflow above.';
    }
    return;
  }

  const wf = currentWorkflow;
  const blocked = currentEntry.validation.errors.length > 0;

  els.runTitle.textContent = wf.title || wf.id;

  if (blocked) {
    els.flashcard.classList.add('error');
    els.flashcard.innerHTML = '<strong>Workflow has validation errors.</strong><br>Fix them in the editor before running. See the red banner above for the details.';
    return;
  }

  // Compute the active step and the wait-steps walked through to reach it.
  let activeId = null;
  let waitsPassed = [];
  if (state.cursor !== 'end') {
    try {
      const w = walkActive(state.cursor);
      activeId = w.active;
      waitsPassed = w.waitsPassed;
    } catch (e) {
      flashError(e.message);
      return;
    }
  }

  // Trail: the last few completed steps + any waits we're currently passing.
  renderTrail(wf, activeId, waitsPassed);

  // Card body.
  if (state.cursor === 'end') {
    els.flashcard.classList.add('complete');
    const h = document.createElement('div');
    h.className = 'fc-complete-title';
    h.textContent = '✓ Workflow complete';
    const s = document.createElement('div');
    s.className = 'fc-complete-sub';
    s.textContent = `${wf.title || wf.id} — ${state.trail.length} step${state.trail.length === 1 ? '' : 's'} done`;
    els.flashcard.appendChild(h);
    els.flashcard.appendChild(s);
    const reset = document.createElement('button');
    reset.className = 'fc-complete-btn';
    reset.style.marginTop = '20px';
    reset.style.maxWidth = '200px';
    reset.style.background = 'white';
    reset.style.color = 'var(--done)';
    reset.style.border = '1.5px solid var(--done)';
    reset.textContent = 'Run again';
    reset.addEventListener('click', onReset);
    els.flashcard.appendChild(reset);
  } else if (activeId) {
    const step = wf.byId[activeId];
    els.flashcard.classList.add('active');

    const head = document.createElement('div');
    head.className = 'fc-head';
    const t = document.createElement('span');
    t.className = 'fc-type';
    t.textContent = step.type;
    const id = document.createElement('span');
    id.className = 'fc-id';
    id.textContent = step.id;
    head.appendChild(t);
    head.appendChild(id);
    els.flashcard.appendChild(head);

    // If we passed through any waits to get here, surface them on the card too.
    if (waitsPassed.length > 0) {
      const ctx = document.createElement('div');
      ctx.className = 'fc-context';
      const intro = document.createElement('strong');
      intro.textContent = waitsPassed.length === 1 ? 'While waiting for:' : 'While waiting for:';
      ctx.appendChild(intro);
      const ul = document.createElement('ul');
      for (const wid of waitsPassed) {
        const ws = wf.byId[wid];
        if (!ws) continue;
        const li = document.createElement('li');
        li.textContent = ws.label;
        ul.appendChild(li);
      }
      ctx.appendChild(ul);
      els.flashcard.appendChild(ctx);
    }

    const lbl = document.createElement('div');
    lbl.className = 'fc-label';
    lbl.textContent = step.label;
    els.flashcard.appendChild(lbl);

    if (step.type === 'action') {
      const btn = document.createElement('button');
      btn.className = 'fc-complete-btn';
      btn.type = 'button';
      btn.textContent = 'Click to complete';
      btn.addEventListener('click', () => onCompleteAction(step.id));
      els.flashcard.appendChild(btn);
    } else if (step.type === 'decision') {
      const opts = document.createElement('div');
      opts.className = 'fc-options';
      for (const opt of step.options) {
        const b = document.createElement('button');
        b.className = 'fc-option-btn';
        b.type = 'button';
        b.textContent = opt.label;
        b.addEventListener('click', () => onChooseOption(step.id, opt.label));
        opts.appendChild(b);
      }
      els.flashcard.appendChild(opts);
    }
  } else {
    els.flashcard.classList.add('empty-card');
    els.flashcard.textContent = 'No active step.';
  }

  // Progress.
  renderProgress(wf);
}

function renderTrail(wf, activeId, waitsPassed) {
  const TRAIL_MAX = 5;
  const items = [];
  // Last K completed steps from the trail.
  const recent = state.trail.slice(-TRAIL_MAX);
  for (const id of recent) {
    const step = wf.byId[id];
    if (!step) continue;
    const cls = step.type === 'wait' ? 'wait' : 'done';
    let text = step.id;
    if (step.type === 'decision' && state.choices[id]) {
      text = `${step.id} → ${shortenText(state.choices[id], 18)}`;
    }
    items.push({ cls, text });
  }
  // The waits we're currently passing through (not yet "done" until next click).
  for (const wid of waitsPassed) {
    const ws = wf.byId[wid];
    if (!ws) continue;
    items.push({ cls: 'wait', text: '⏸ ' + ws.id });
  }
  // The current step (active or "end" pill).
  if (activeId) {
    items.push({ cls: 'current', text: '▶ ' + activeId });
  } else if (state.cursor === 'end') {
    items.push({ cls: 'current', text: '✓ end' });
  }

  // Place an arrow between each pair, drop overflow on the left so the latest stuff stays visible.
  const maxShown = 8;
  const display = items.length > maxShown ? items.slice(items.length - maxShown) : items;
  if (items.length > display.length) {
    const dots = document.createElement('span');
    dots.className = 'trail-arrow';
    dots.textContent = '…';
    els.runTrail.appendChild(dots);
  }
  display.forEach((it, i) => {
    if (i > 0) {
      const arr = document.createElement('span');
      arr.className = 'trail-arrow';
      arr.textContent = '›';
      els.runTrail.appendChild(arr);
    }
    const pill = document.createElement('span');
    pill.className = 'trail-item ' + it.cls;
    pill.textContent = it.text;
    els.runTrail.appendChild(pill);
  });
}

function renderProgress(wf) {
  // Show "X of Y completed" with a small bar. Y = total steps in the workflow.
  const total = wf.steps.length;
  const done = state.trail.length;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  els.runProgress.innerHTML =
    `<span>${done} of ${total}</span>` +
    `<span class="bar"><span style="width:${pct}%"></span></span>` +
    `<span>${pct}%</span>`;
}

function shortenText(s, max) {
  s = String(s == null ? '' : s);
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

// (The diagram-style runner with arrow drawing and side-routing has been
// removed in favour of the flashcard renderer above. The editor preview has
// its own SVG renderer in editor.js. See git history for the original.)
