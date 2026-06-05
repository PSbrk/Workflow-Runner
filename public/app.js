// Workflow Runner — main client.
//
// Templates (the JSON files in workflows/) are blueprints.
// Instances are live runs: each instance carries its own SNAPSHOT of a
// template's steps[] plus its own trail / choices / cursor / completedAck.
// Mutations on a template don't affect already-running instances.
//
// Routing rules (walk through waits, loop-reset on revisit, etc.) are
// unchanged from the original spec — see walkActive / advance below.

const els = {
  select:         document.getElementById('wf-select'),          // template picker
  instanceSelect: document.getElementById('instance-select'),    // instance picker
  newBtn:         document.getElementById('new-btn'),
  newMenu:        document.getElementById('new-menu'),
  editBtn:        document.getElementById('edit-btn'),
  resetBtn:       document.getElementById('reset-btn'),
  importBtn:      document.getElementById('import-btn'),
  exportBtn:      document.getElementById('export-btn'),
  importFile:     document.getElementById('import-file'),
  statusBar:      document.getElementById('status-bar'),
  errorsBar:      document.getElementById('errors-bar'),
  warningsBar:    document.getElementById('warnings-bar'),
  runTitle:       document.getElementById('run-title'),
  runSubtitle:    document.getElementById('run-subtitle'),
  runTrail:       document.getElementById('run-trail'),
  flashcard:      document.getElementById('flashcard'),
  runProgress:    document.getElementById('run-progress'),
  renameBtn:      document.getElementById('rename-btn'),
  deleteBtn:      document.getElementById('delete-btn'),
  // New-instance modal
  niModal:        document.getElementById('new-instance-modal'),
  niTemplate:     document.getElementById('ni-template'),
  niTemplateWarn: document.getElementById('ni-template-warn'),
  niTitle:        document.getElementById('ni-title'),
  niCancel:       document.getElementById('ni-cancel'),
  niCreate:       document.getElementById('ni-create'),
};

let allWorkflows = [];      // template entries from /api/workflows
let currentEntry = null;    // selected template entry (for editing / new-instance source)
let currentWorkflow = null; // decorated workflow being WORKED THROUGH (the open instance's steps)
let currentInstance = null; // open instance, or null
let state = null;           // alias of currentInstance (same {trail, choices, cursor})

// (Diagram layout constants were removed with the diagram renderer.)

// ---------- Init ----------
init();

async function init() {
  // Client-side mode: seed the template store from the bundled examples on
  // first run. Subsequent runs see the user's own templates and never touch
  // the bundled defaults again.
  WfrTemplates.bootstrapIfEmpty();

  els.select.addEventListener('change', onTemplateSelectChange);
  els.instanceSelect.addEventListener('change', onInstanceSelectChange);
  els.resetBtn.addEventListener('click', onReset);
  els.editBtn.addEventListener('click', onEdit);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.exportBtn.addEventListener('click', onExportTemplates);
  els.importFile.addEventListener('change', onImportTemplates);

  // "+ New" split button: opens the dropdown menu.
  els.newBtn.addEventListener('click', toggleNewMenu);
  document.addEventListener('click', (e) => {
    if (e.target.closest('.new-dropdown')) return;
    closeNewMenu();
  });
  els.newMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-new]');
    if (!btn) return;
    closeNewMenu();
    const kind = btn.getAttribute('data-new');
    if (kind === 'workflow')   onNewTemplate();
    else if (kind === 'instance') onNewInstance();
  });

  // Rename / Delete buttons (only meaningful when an instance is open).
  els.renameBtn.addEventListener('click', onRenameInstance);
  els.deleteBtn.addEventListener('click', onDeleteInstance);

  // New-instance modal handlers.
  els.niCancel.addEventListener('click', closeNewInstanceModal);
  els.niCreate.addEventListener('click', confirmCreateInstance);
  els.niTemplate.addEventListener('change', refreshNiTemplateWarn);
  els.niTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmCreateInstance(); }
  });
  els.niModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeNewInstanceModal();
  });

  await loadAll();
  // Resume whichever instance was open last (if any).
  refreshInstanceDropdown();
  const openId = WfrInstances.getOpenId();
  if (openId && WfrInstances.load(openId)) {
    openInstance(openId);
  } else {
    render();
  }
}

// ---------- "+ New" dropdown ----------
function toggleNewMenu(e) {
  if (e) e.stopPropagation();
  const open = !els.newMenu.classList.contains('hidden');
  els.newMenu.classList.toggle('hidden', open);
  els.newBtn.setAttribute('aria-expanded', String(!open));
}
function closeNewMenu() {
  els.newMenu.classList.add('hidden');
  els.newBtn.setAttribute('aria-expanded', 'false');
}

function onNewTemplate() {
  if (globalThis.WfrEditor) globalThis.WfrEditor.enterNew();
}

function onNewInstance() {
  openNewInstanceModal();
}

function onEdit() {
  if (!currentEntry) {
    alert('Pick a template from the Workflow dropdown first.');
    return;
  }
  if (!globalThis.WfrEditor) return;
  if (currentEntry.parseError || !currentEntry.workflow) {
    if (!confirm(`"${currentEntry.file}" failed to parse. Open a blank editor instead?`)) return;
    globalThis.WfrEditor.enterNew();
    return;
  }
  globalThis.WfrEditor.enterEdit(currentEntry.workflow, currentEntry.file);
}

// ---------- New-instance modal ----------
function openNewInstanceModal() {
  // Populate template dropdown
  els.niTemplate.innerHTML = '';
  const runnable = allWorkflows.filter((e) => e.workflow && !e.validation.errors.length);
  if (runnable.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no valid templates)';
    els.niTemplate.appendChild(opt);
  } else {
    for (const e of runnable) {
      const opt = document.createElement('option');
      opt.value = e.workflow.id;
      opt.textContent = e.workflow.title || e.workflow.id;
      els.niTemplate.appendChild(opt);
    }
    // Default to currently-selected template if it's valid.
    if (currentEntry && currentEntry.workflow && !currentEntry.validation.errors.length) {
      els.niTemplate.value = currentEntry.workflow.id;
    }
  }
  els.niTitle.value = '';
  els.niTitle.placeholder = suggestTitle();
  refreshNiTemplateWarn();
  els.niModal.classList.remove('hidden');
  setTimeout(() => els.niTitle.focus(), 0);
}

function closeNewInstanceModal() {
  els.niModal.classList.add('hidden');
}

function refreshNiTemplateWarn() {
  const id = els.niTemplate.value;
  const entry = allWorkflows.find((e) => e.workflow && e.workflow.id === id);
  if (!entry || entry.validation.errors.length) {
    els.niTemplateWarn.textContent = 'This template has validation errors — instances can only run validated templates.';
    els.niTemplateWarn.classList.remove('hidden');
    els.niCreate.disabled = true;
  } else {
    els.niTemplateWarn.classList.add('hidden');
    els.niCreate.disabled = false;
  }
  if (entry && entry.workflow) {
    els.niTitle.placeholder = (entry.workflow.title || entry.workflow.id);
  }
}

function suggestTitle() {
  if (currentEntry && currentEntry.workflow) return currentEntry.workflow.title || currentEntry.workflow.id;
  return 'My instance';
}

function confirmCreateInstance() {
  const id = els.niTemplate.value;
  const entry = allWorkflows.find((e) => e.workflow && e.workflow.id === id);
  if (!entry || !entry.workflow) {
    alert('Pick a template first.');
    return;
  }
  if (entry.validation.errors.length) {
    alert('That template has validation errors. Fix them in the editor first.');
    return;
  }
  const title = (els.niTitle.value || '').trim() || (entry.workflow.title || entry.workflow.id);
  let instance;
  try {
    instance = WfrInstances.create(entry.workflow, title);
  } catch (e) {
    alert('Could not create instance: ' + e.message);
    return;
  }
  closeNewInstanceModal();
  refreshInstanceDropdown(instance.id);
  openInstance(instance.id);
}

// ---------- Instance lifecycle ----------
function refreshInstanceDropdown(preferId) {
  const all = WfrInstances.listAll();
  els.instanceSelect.innerHTML = '';
  if (all.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no instances)';
    els.instanceSelect.appendChild(opt);
    els.instanceSelect.disabled = true;
    return;
  }
  els.instanceSelect.disabled = false;
  for (const inst of all) {
    const opt = document.createElement('option');
    opt.value = inst.id;
    opt.textContent = inst.title + (inst.cursor === 'end' ? '  ✓' : '');
    els.instanceSelect.appendChild(opt);
  }
  const target = preferId && all.some((i) => i.id === preferId)
    ? preferId
    : (currentInstance && all.some((i) => i.id === currentInstance.id) ? currentInstance.id : all[0].id);
  els.instanceSelect.value = target;
}

function onInstanceSelectChange() {
  const id = els.instanceSelect.value;
  if (!id) return;
  openInstance(id);
}

function openInstance(id) {
  const inst = WfrInstances.load(id);
  if (!inst) {
    currentInstance = null;
    currentWorkflow = null;
    state = null;
    WfrInstances.setOpenId(null);
    render();
    return;
  }
  currentInstance = inst;
  currentWorkflow = decorateWorkflow({
    id: inst.id,
    title: inst.title,
    steps: inst.steps,
  });
  state = inst;            // alias — same trail/choices/cursor object
  WfrInstances.setOpenId(inst.id);
  // Sync the instance dropdown value (in case openInstance was called
  // programmatically rather than via the dropdown).
  if (els.instanceSelect.value !== inst.id) els.instanceSelect.value = inst.id;
  render();
}

function closeInstance() {
  currentInstance = null;
  currentWorkflow = null;
  state = null;
  WfrInstances.setOpenId(null);
  render();
}

function onRenameInstance() {
  if (!currentInstance) return;
  const newTitle = prompt('Rename instance:', currentInstance.title);
  if (newTitle === null) return;
  const trimmed = newTitle.trim();
  if (!trimmed || trimmed === currentInstance.title) return;
  WfrInstances.rename(currentInstance, trimmed);
  refreshInstanceDropdown(currentInstance.id);
  render();
}

function onDeleteInstance() {
  if (!currentInstance) return;
  if (!confirm(`Delete instance "${currentInstance.title}"? This cannot be undone.`)) return;
  deleteCurrentInstance();
}

function deleteCurrentInstance() {
  if (!currentInstance) return;
  const id = currentInstance.id;
  WfrInstances.remove(id);
  // Promote the next remaining instance, or fall to the empty state.
  const remaining = WfrInstances.listAll();
  currentInstance = null;
  currentWorkflow = null;
  state = null;
  refreshInstanceDropdown(remaining[0] && remaining[0].id);
  if (remaining[0]) openInstance(remaining[0].id);
  else { WfrInstances.setOpenId(null); render(); }
}

// Exposed to the editor for cross-module coordination.
globalThis.WfrApp = {
  getKnownIds: () => allWorkflows.filter((e) => e.workflow && e.workflow.id).map((e) => e.workflow.id),
  getFileForId: (id) => {
    const m = allWorkflows.find((e) => e.workflow && e.workflow.id === id);
    return m ? m.file : null;
  },
  refresh: (preferId) => loadAll(preferId),
  // refreshSilent: re-fetch the workflow list (so the picker reflects any
  // renames/new files from a save) without forcing a selection change or
  // disrupting an open editor.
  refreshSilent: async (preferId) => {
    // Same as loadAll() but skips re-rendering the runner. Used by the editor
    // after a Save so the picker reflects renames / new files without
    // disrupting an open editor.
    const stored = WfrTemplates.listAll();
    const entries = stored.map((wf) => ({
      file: (wf.id || 'workflow') + '.json',
      workflow: wf,
      validation: validateWorkflow(wf),
    }));
    allWorkflows = entries;
    const prevValue = els.select.value;
    els.select.innerHTML = '';
    for (const e of entries) {
      const opt = document.createElement('option');
      const id = (e.workflow && e.workflow.id) || e.file;
      const title = (e.workflow && e.workflow.title) || id;
      opt.value = id;
      const badge = e.validation.errors.length ? ' ⚠ errors' : (e.validation.warnings.length ? ' ⚠ warnings' : '');
      opt.textContent = `${title}${badge}`;
      els.select.appendChild(opt);
    }
    const has = (id) => entries.some((e) => e.workflow && e.workflow.id === id);
    const target = (preferId && has(preferId)) ? preferId
                : (prevValue && has(prevValue)) ? prevValue
                : (entries[0] && entries[0].workflow && entries[0].workflow.id) || '';
    els.select.value = target;
    selectTemplate(target);
  },
};

// ---------- Import / Export ----------
function onExportTemplates() {
  const payload = WfrTemplates.exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workflow-templates-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function onImportTemplates(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const result = WfrTemplates.importPayload(payload);
      const total = result.added + result.replaced;
      if (total === 0) {
        alert(`Nothing imported.${result.skipped ? ' ' + result.skipped + ' entries skipped (missing id or steps).' : ''}`);
      } else {
        alert(`Imported ${total} template(s) — ${result.added} new, ${result.replaced} replaced${result.skipped ? ', ' + result.skipped + ' skipped' : ''}.`);
        loadAll();
      }
    } catch (err) {
      alert('Could not parse the file as JSON: ' + err.message);
    }
    // Reset the file input so the same file can be picked again later.
    e.target.value = '';
  };
  reader.readAsText(file);
}

async function loadAll(preferId) {
  // Client-side mode: templates live in localStorage via WfrTemplates.
  // No network call, but kept async so the call-site contract is unchanged.
  const stored = WfrTemplates.listAll();
  const entries = stored.map((wf) => ({
    file: (wf.id || 'workflow') + '.json',
    workflow: wf,
    validation: validateWorkflow(wf),
  }));
  allWorkflows = entries;

  // Populate the TEMPLATE selector.
  const prevValue = els.select.value;
  els.select.innerHTML = '';
  if (entries.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no templates in workflows/)';
    els.select.appendChild(opt);
    currentEntry = null;
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
  selectTemplate(target);
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

// ---------- Template selection ----------
// The Workflow dropdown picks the TEMPLATE that Edit / "+ New → Instance"
// operate on. Templates are never "run" — only viewed/edited. Working
// through happens on instances (see openInstance).
function onTemplateSelectChange() {
  selectTemplate(els.select.value);
}

function selectTemplate(idOrFile) {
  currentEntry = allWorkflows.find((e) => (e.workflow && e.workflow.id === idOrFile) || e.file === idOrFile) || null;
  renderErrorsWarnings();
  // No state change here — template selection is independent of which
  // instance is currently open. Re-render only if no instance is open
  // (since the empty-state view mentions the selected template).
  if (!currentInstance) render();
}

function decorateWorkflow(wf) {
  const byId = Object.create(null);
  const indexById = Object.create(null);
  wf.steps.forEach((s, i) => { byId[s.id] = s; indexById[s.id] = i; });
  return Object.assign({}, wf, { byId, indexById });
}

function saveState() {
  if (!currentInstance) return;
  WfrInstances.save(currentInstance);
}

function onReset() {
  if (!currentInstance) {
    alert('No instance open. Pick one from the Instance dropdown or create a new one.');
    return;
  }
  WfrInstances.resetProgress(currentInstance);
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
    els.errorsBar.innerHTML = `<strong>This template has errors — you can't create instances from it.</strong><ul>${items}</ul>`;
    els.errorsBar.classList.remove('hidden');
  }
  if (v.warnings.length) {
    const items = v.warnings.map(formatIssue).join('');
    els.warningsBar.innerHTML = `<strong>Template warnings:</strong><ul>${items}</ul>`;
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

  // Mutate the instance in place (state IS currentInstance — see openInstance).
  state.trail = trail;
  state.choices = choices;
  state.cursor = nextCursor;
  saveState();
  refreshInstanceDropdown(currentInstance.id);
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
  els.runSubtitle.textContent = '';
  els.runTrail.innerHTML = '';
  els.flashcard.innerHTML = '';
  els.runProgress.innerHTML = '';
  els.flashcard.className = 'flashcard';
  els.renameBtn.classList.add('hidden');
  els.deleteBtn.classList.add('hidden');

  // No instance open → empty/encouragement state.
  if (!currentInstance || !currentWorkflow) {
    renderEmptyState();
    return;
  }

  const wf = currentWorkflow;
  els.runTitle.textContent = currentInstance.title;
  els.runSubtitle.textContent = 'from ' + currentInstance.templateTitle;
  els.renameBtn.classList.remove('hidden');
  els.deleteBtn.classList.remove('hidden');

  // Validate the instance's snapshot — should be valid because templates are
  // validated before instance creation, but guard anyway.
  const v = validateWorkflow({ id: currentInstance.id, steps: currentInstance.steps });
  if (v.errors.length) {
    els.flashcard.classList.add('error');
    const items = v.errors.map((e) => `<li>${escapeHtml((e.stepId ? e.stepId + ': ' : '') + e.message)}</li>`).join('');
    els.flashcard.innerHTML = `<strong>Instance snapshot has validation errors:</strong><ul>${items}</ul>`;
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
    renderCompletedCard();
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

function renderEmptyState() {
  els.flashcard.classList.add('empty-card');
  const allInst = WfrInstances.listAll();
  if (allWorkflows.length === 0) {
    els.flashcard.innerHTML =
      '<div style="text-align:center;">' +
        '<div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">No templates yet</div>' +
        '<div style="color:var(--muted);font-style:normal;">Click <strong>+ New ▾</strong> → <strong>Workflow (template)</strong> to author one, or drop a JSON file into <code>workflows/</code> and click <strong>Reload</strong>.</div>' +
      '</div>';
    return;
  }
  if (allInst.length === 0) {
    els.flashcard.innerHTML =
      '<div style="text-align:center;">' +
        '<div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">No instances yet</div>' +
        '<div style="color:var(--muted);font-style:normal;">Click <strong>+ New ▾</strong> → <strong>Instance</strong> to start a new run from one of your templates.</div>' +
      '</div>';
    return;
  }
  els.flashcard.innerHTML =
    '<div style="text-align:center;">' +
      '<div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">No instance open</div>' +
      '<div style="color:var(--muted);font-style:normal;">Pick one from the <strong>Instance</strong> dropdown, or click <strong>+ New ▾</strong> → <strong>Instance</strong>.</div>' +
    '</div>';
}

function renderCompletedCard() {
  els.flashcard.classList.add('complete');
  const h = document.createElement('div');
  h.className = 'fc-complete-title';
  h.textContent = '✓ Workflow complete';
  const s = document.createElement('div');
  s.className = 'fc-complete-sub';
  s.textContent = `${currentInstance.title} — ${state.trail.length} step${state.trail.length === 1 ? '' : 's'} done`;
  els.flashcard.appendChild(h);
  els.flashcard.appendChild(s);

  if (!state.completedAcknowledged) {
    // Initial reach-the-end prompt: "Confirm you have ended this workflow."
    const box = document.createElement('div');
    box.className = 'end-confirm';
    const msg = document.createElement('div');
    msg.className = 'end-confirm-msg';
    msg.textContent = 'Confirm you have ended this workflow.';
    box.appendChild(msg);
    const btnRow = document.createElement('div');
    btnRow.className = 'end-confirm-buttons';
    const yes = document.createElement('button');
    yes.className = 'yes';
    yes.textContent = 'Yes — delete this instance';
    yes.addEventListener('click', onConfirmEndYes);
    const no  = document.createElement('button');
    no.className  = 'no';
    no.textContent  = 'No, keep it';
    no.addEventListener('click', onConfirmEndNo);
    btnRow.appendChild(yes);
    btnRow.appendChild(no);
    box.appendChild(btnRow);
    els.flashcard.appendChild(box);
  } else {
    // Already acknowledged → just offer Start again + an unobtrusive delete link.
    const actions = document.createElement('div');
    actions.className = 'fc-completed-actions';
    const restart = document.createElement('button');
    restart.className = 'restart';
    restart.textContent = 'Start again';
    restart.addEventListener('click', onStartAgain);
    actions.appendChild(restart);
    const del = document.createElement('button');
    del.className = 'delete-link';
    del.textContent = 'Delete this instance';
    del.addEventListener('click', onDeleteInstance);
    actions.appendChild(del);
    els.flashcard.appendChild(actions);
  }
}

function onConfirmEndYes() {
  // Yes → delete the instance permanently.
  deleteCurrentInstance();
}

function onConfirmEndNo() {
  // No → keep the instance in its completed state; remember the user
  // declined so the prompt doesn't reappear next time they open it.
  if (!currentInstance) return;
  state.completedAcknowledged = true;
  saveState();
  refreshInstanceDropdown(currentInstance.id);
  render();
}

function onStartAgain() {
  if (!currentInstance) return;
  WfrInstances.resetProgress(currentInstance);
  refreshInstanceDropdown(currentInstance.id);
  render();
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
