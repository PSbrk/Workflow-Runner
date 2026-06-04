// Workflow editor — form-based + raw JSON, with live preview.
//
// Public API (on globalThis.WfrEditor):
//   enterEdit(workflow, originalFile)  — open editor on an existing workflow
//   enterNew()                          — open editor on a blank workflow
//   enterDuplicate(workflow)            — open editor on a copy under a fresh id
//   isActive()                          — true while editor is open
//
// The editor talks to app.js through globalThis.WfrApp for:
//   getKnownIds()    — used to choose a unique id for new/duplicate
//   refresh(id?)     — reload the picker after save/delete, optionally selecting id

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

  const editing = {
    active: false,
    workflow: null,       // the editable workflow (live mutated)
    originalFile: null,   // source filename on disk, null for new
    tab: 'form',          // 'canvas' | 'form' | 'json'
  };

  let els = null;
  function E() {
    if (els) return els;
    els = {
      runView:        document.getElementById('run-view'),
      editView:       document.getElementById('edit-view'),
      editSplit:      document.querySelector('#edit-view .edit-split'),
      tabCanvas:      document.getElementById('ed-tab-canvas'),
      tabForm:        document.getElementById('ed-tab-form'),
      tabJson:        document.getElementById('ed-tab-json'),
      closeEditor:    document.getElementById('ed-close-editor'),
      canvasPane:     document.getElementById('ed-canvas'),
      canvasSvg:      document.getElementById('canvas-svg'),
      canvasIdInput: document.getElementById('ed-id-canvas'),
      canvasTitleInput: document.getElementById('ed-title-canvas'),
      canvasValidation: document.getElementById('canvas-validation'),
      formPane:       document.getElementById('ed-form'),
      jsonPane:       document.getElementById('ed-json'),
      jsonText:       document.getElementById('ed-json-text'),
      jsonStatus:     document.getElementById('ed-json-status'),
      id:             document.getElementById('ed-id'),
      title:          document.getElementById('ed-title'),
      steps:          document.getElementById('ed-steps'),
      addStep:        document.getElementById('ed-add-step'),
      validation:     document.getElementById('ed-validation'),
      save:           document.getElementById('ed-save'),
      saveClose:      document.getElementById('ed-save-close'),
      saveAs:         document.getElementById('ed-save-as'),
      cancel:         document.getElementById('ed-cancel'),
      delete:         document.getElementById('ed-delete'),
      saveStatus:     document.getElementById('ed-save-status'),
      select:         document.getElementById('wf-select'),
      newBtn:         document.getElementById('new-btn'),
      editBtn:        document.getElementById('edit-btn'),
      resetBtn:       document.getElementById('reset-btn'),
      reloadBtn:      document.getElementById('reload-btn'),
    };
    return els;
  }

  const deepCopy = (x) => JSON.parse(JSON.stringify(x));

  function blankWorkflow(id) {
    return {
      id: id || 'new-workflow',
      title: 'New Workflow',
      steps: [{ id: 's1', type: 'action', label: 'First step' }],
    };
  }

  function uniqueIdFromBase(base) {
    const known = (globalThis.WfrApp && globalThis.WfrApp.getKnownIds) ? globalThis.WfrApp.getKnownIds() : [];
    let candidate = base;
    let n = 1;
    while (known.includes(candidate)) {
      n++;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }

  // ---------- enter / exit ----------
  function enterEdit(workflow, originalFile) {
    editing.active = true;
    editing.workflow = workflow ? deepCopy(workflow) : blankWorkflow();
    editing.originalFile = originalFile || null;
    editing.tab = 'canvas';
    show();
  }

  function enterNew() {
    editing.active = true;
    editing.workflow = blankWorkflow(uniqueIdFromBase('new-workflow'));
    editing.originalFile = null;
    editing.tab = 'canvas';
    show();
  }

  function enterDuplicate(workflow) {
    editing.active = true;
    const copy = workflow ? deepCopy(workflow) : blankWorkflow();
    copy.id = uniqueIdFromBase((workflow && workflow.id || 'workflow') + '-copy');
    copy.title = ((workflow && workflow.title) || (workflow && workflow.id) || 'Workflow') + ' (copy)';
    editing.workflow = copy;
    editing.originalFile = null;
    editing.tab = 'canvas';
    show();
  }

  function show() {
    const e = E();
    e.runView.classList.add('hidden');
    e.editView.classList.remove('hidden');
    document.body.classList.add('editing');
    e.select.disabled = true;
    e.newBtn.disabled = true;
    e.editBtn.disabled = true;
    e.resetBtn.disabled = true;
    // Hide app-level banners while editing — the editor has its own validation panel.
    document.getElementById('warnings-bar').classList.add('hidden');
    document.getElementById('errors-bar').classList.add('hidden');
    bindHandlersOnce();
    render();
  }

  function hide(refreshList) {
    editing.active = false;
    if (globalThis.WfrEditorCanvas) globalThis.WfrEditorCanvas.destroy();
    const e = E();
    if (e.saveStatus) e.saveStatus.classList.add('hidden');
    if (saveStatusTimer) { clearTimeout(saveStatusTimer); saveStatusTimer = null; }
    e.runView.classList.remove('hidden');
    e.editView.classList.add('hidden');
    document.body.classList.remove('editing');
    e.select.disabled = false;
    e.newBtn.disabled = false;
    e.editBtn.disabled = false;
    e.resetBtn.disabled = false;
    const targetId = editing.workflow ? editing.workflow.id : null;
    if (refreshList && globalThis.WfrApp && globalThis.WfrApp.refresh) {
      globalThis.WfrApp.refresh(targetId);
    }
  }

  let handlersBound = false;
  function bindHandlersOnce() {
    if (handlersBound) return;
    handlersBound = true;
    const e = E();
    e.tabCanvas.addEventListener('click', () => switchTab('canvas'));
    e.tabForm.addEventListener('click',   () => switchTab('form'));
    e.tabJson.addEventListener('click',   () => switchTab('json'));
    if (e.closeEditor)  e.closeEditor.addEventListener('click', onCancel);
    e.id.addEventListener('input', (ev) => { editing.workflow.id = ev.target.value.trim(); renderValidation(); renderPreview(); });
    e.title.addEventListener('input', (ev) => { editing.workflow.title = ev.target.value; renderValidation(); renderPreview(); });
    e.addStep.addEventListener('click', onAddStep);
    e.save.addEventListener('click', () => onSave(false));
    if (e.saveClose) e.saveClose.addEventListener('click', () => onSave(true));
    e.saveAs.addEventListener('click', onSaveAs);
    e.cancel.addEventListener('click', onCancel);
    e.delete.addEventListener('click', onDelete);
    e.jsonText.addEventListener('input', onJsonInput);
  }

  // ---------- Tabs ----------
  function switchTab(tab) {
    if (tab === editing.tab) return;
    const e = E();
    // Leaving JSON requires parsing the text into the workflow model.
    if (editing.tab === 'json' && tab !== 'json') {
      try {
        editing.workflow = JSON.parse(e.jsonText.value);
      } catch (err) {
        e.jsonStatus.textContent = 'Cannot leave Raw JSON tab: parse error — ' + err.message;
        e.jsonStatus.className = 'ed-json-status err';
        return;
      }
    }
    // Leaving canvas: tear down the canvas event handlers.
    if (editing.tab === 'canvas' && tab !== 'canvas' && globalThis.WfrEditorCanvas) {
      globalThis.WfrEditorCanvas.destroy();
    }
    editing.tab = tab;
    // Entering JSON: serialize current model into the textarea.
    if (tab === 'json') {
      e.jsonText.value = JSON.stringify(editing.workflow, null, 2);
      e.jsonStatus.textContent = 'Editing raw JSON. Switching tabs will parse the text and apply.';
      e.jsonStatus.className = 'ed-json-status';
    }
    render();
  }

  function updateTabUI() {
    const e = E();
    e.tabCanvas.classList.toggle('active', editing.tab === 'canvas');
    e.tabForm.classList.toggle('active',   editing.tab === 'form');
    e.tabJson.classList.toggle('active',   editing.tab === 'json');
    e.canvasPane.classList.toggle('hidden', editing.tab !== 'canvas');
    e.formPane.classList.toggle('hidden',   editing.tab !== 'form');
    e.jsonPane.classList.toggle('hidden',   editing.tab !== 'json');
  }

  // ---------- Render orchestration ----------
  function render() {
    captureFocusAndRun(() => {
      updateTabUI();
      if (editing.tab === 'form')   buildForm();
      if (editing.tab === 'canvas') initCanvasIfNeeded();
      renderValidation();
    });
  }

  function initCanvasIfNeeded() {
    if (!globalThis.WfrEditorCanvas) return;
    const e = E();
    globalThis.WfrEditorCanvas.init(
      editing.workflow,
      e.canvasSvg,
      e.canvasPane,           // palette buttons live inside this
      e.canvasIdInput,
      e.canvasTitleInput,
      e.canvasValidation,
      () => {
        // Canvas mutated workflow → revalidate top panel, but no need to
        // re-render canvas itself (it manages its own DOM).
        renderValidation();
      }
    );
  }

  function captureFocusAndRun(fn) {
    const el = document.activeElement;
    let key = null, ss = null, se = null;
    if (el && el.dataset && el.dataset.focusKey) {
      key = el.dataset.focusKey;
      try { ss = el.selectionStart; se = el.selectionEnd; } catch (_) {}
    }
    fn();
    if (key) {
      const sel = '[data-focus-key="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]';
      const back = document.querySelector(sel);
      if (back) {
        back.focus();
        try { if (ss != null) back.setSelectionRange(ss, se); } catch (_) {}
      }
    }
  }

  // ---------- Form builder ----------
  function buildForm() {
    const e = E();
    e.id.value = editing.workflow.id || '';
    e.id.dataset.focusKey = 'meta-id';
    e.title.value = editing.workflow.title || '';
    e.title.dataset.focusKey = 'meta-title';

    e.steps.innerHTML = '';
    const steps = Array.isArray(editing.workflow.steps) ? editing.workflow.steps : (editing.workflow.steps = []);
    steps.forEach((step, i) => e.steps.appendChild(buildStepCard(step, i, steps)));
  }

  function buildStepCard(step, index, allSteps) {
    const li = document.createElement('li');
    li.className = 'ed-step';

    // --- head row: # | id | type | up/down/delete
    const head = document.createElement('div');
    head.className = 'ed-step-head';

    const num = document.createElement('div');
    num.className = 'ed-step-num';
    num.textContent = '#' + (index + 1);
    head.appendChild(num);

    const idIn = document.createElement('input');
    idIn.type = 'text';
    idIn.className = 'ed-step-id';
    idIn.value = step.id || '';
    idIn.placeholder = 's' + (index + 1);
    idIn.dataset.focusKey = `step-${index}-id`;
    idIn.addEventListener('input', (ev) => onStepIdChange(index, ev.target.value));
    head.appendChild(idIn);

    const typeSel = document.createElement('select');
    typeSel.className = 'ed-step-type';
    [['action', 'Action'], ['wait', 'Wait'], ['decision', 'Decision']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = l;
      if (step.type === v) o.selected = true;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener('change', (ev) => onStepTypeChange(index, ev.target.value));
    head.appendChild(typeSel);

    const controls = document.createElement('div');
    controls.className = 'ed-step-controls';
    const upBtn = makeIconBtn('↑', 'Move up', () => moveStep(index, -1));
    upBtn.disabled = index === 0;
    const downBtn = makeIconBtn('↓', 'Move down', () => moveStep(index, +1));
    downBtn.disabled = index === allSteps.length - 1;
    const delBtn = makeIconBtn('✕', 'Delete step', () => deleteStep(index));
    delBtn.classList.add('del');
    delBtn.disabled = allSteps.length === 1;
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(delBtn);
    head.appendChild(controls);

    li.appendChild(head);

    // --- label row
    const labelRow = document.createElement('div');
    labelRow.className = 'ed-step-label-row';
    const labelIn = document.createElement('input');
    labelIn.type = 'text';
    labelIn.value = step.label || '';
    labelIn.placeholder = 'What happens at this step?';
    labelIn.dataset.focusKey = `step-${index}-label`;
    labelIn.addEventListener('input', (ev) => {
      step.label = ev.target.value;
      renderValidation();
      renderPreview();
    });
    labelRow.appendChild(labelIn);
    li.appendChild(labelRow);

    // --- routing
    const routing = document.createElement('div');
    routing.className = 'ed-step-routing';
    if (step.type === 'decision') {
      buildDecisionRouting(routing, step, index, allSteps);
    } else {
      buildNextRouting(routing, step, index, allSteps);
    }
    li.appendChild(routing);

    return li;
  }

  function makeIconBtn(text, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  function buildNextRouting(container, step, index, allSteps) {
    const lbl = document.createElement('div');
    lbl.className = 'ed-routing-label';
    lbl.textContent = 'Next';
    container.appendChild(lbl);

    const sel = document.createElement('select');
    sel.dataset.focusKey = `step-${index}-next`;
    populateTargetSelect(sel, allSteps, { includeDefault: true });

    let cur;
    if (Object.prototype.hasOwnProperty.call(step, 'next') && step.next !== undefined) {
      cur = step.next;
    } else {
      cur = '__default__';
    }
    sel.value = cur;
    if (sel.value !== cur) {
      const broken = document.createElement('option');
      broken.value = cur;
      broken.textContent = `⚠ ${cur} (broken reference)`;
      sel.insertBefore(broken, sel.firstChild);
      sel.value = cur;
    }
    sel.addEventListener('change', (ev) => {
      const v = ev.target.value;
      if (v === '__default__') delete step.next;
      else step.next = v;
      render();
    });
    container.appendChild(sel);
  }

  function buildDecisionRouting(container, step, index, allSteps) {
    const lbl = document.createElement('div');
    lbl.className = 'ed-routing-label';
    lbl.textContent = 'Options';
    container.appendChild(lbl);

    const list = document.createElement('div');
    list.className = 'ed-options';
    container.appendChild(list);

    if (!Array.isArray(step.options)) step.options = [];

    step.options.forEach((opt, oi) => {
      const row = document.createElement('div');
      row.className = 'ed-option';

      const labelIn = document.createElement('input');
      labelIn.type = 'text';
      labelIn.value = opt.label || '';
      labelIn.placeholder = 'Yes';
      labelIn.dataset.focusKey = `step-${index}-opt-${oi}-label`;
      labelIn.addEventListener('input', (ev) => {
        opt.label = ev.target.value;
        renderValidation();
        renderPreview();
      });
      row.appendChild(labelIn);

      const arrow = document.createElement('span');
      arrow.className = 'ed-arrow';
      arrow.textContent = '→';
      row.appendChild(arrow);

      const gotoSel = document.createElement('select');
      gotoSel.dataset.focusKey = `step-${index}-opt-${oi}-goto`;
      populateTargetSelect(gotoSel, allSteps, { includeDefault: false, placeholder: '— pick target —' });
      const cur = opt.goto || '';
      gotoSel.value = cur;
      if (cur && gotoSel.value !== cur) {
        const broken = document.createElement('option');
        broken.value = cur;
        broken.textContent = `⚠ ${cur} (broken reference)`;
        gotoSel.insertBefore(broken, gotoSel.firstChild);
        gotoSel.value = cur;
      }
      gotoSel.addEventListener('change', (ev) => {
        opt.goto = ev.target.value;
        render();
      });
      row.appendChild(gotoSel);

      const del = makeIconBtn('✕', 'Remove option', () => {
        step.options.splice(oi, 1);
        render();
      });
      del.classList.add('del');
      row.appendChild(del);

      list.appendChild(row);
    });

    const addOpt = document.createElement('button');
    addOpt.type = 'button';
    addOpt.className = 'ed-add-option';
    addOpt.textContent = '+ Add option';
    addOpt.addEventListener('click', () => {
      step.options.push({ label: '', goto: 'end' });
      render();
    });
    container.appendChild(addOpt);
  }

  function populateTargetSelect(sel, allSteps, opts) {
    opts = opts || {};
    if (opts.placeholder) {
      const p = document.createElement('option');
      p.value = '';
      p.textContent = opts.placeholder;
      p.disabled = true;
      sel.appendChild(p);
    }
    if (opts.includeDefault) {
      const def = document.createElement('option');
      def.value = '__default__';
      def.textContent = '(default — next step in order)';
      sel.appendChild(def);
    }
    const endOpt = document.createElement('option');
    endOpt.value = 'end';
    endOpt.textContent = 'end (finish workflow)';
    sel.appendChild(endOpt);
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '──────────';
    sel.appendChild(sep);
    for (const s of allSteps) {
      if (!s || !s.id) continue;
      const o = document.createElement('option');
      o.value = s.id;
      const lbl = (s.label || '').slice(0, 36);
      o.textContent = lbl ? `${s.id} — ${lbl}` : s.id;
      sel.appendChild(o);
    }
  }

  // ---------- Step list operations ----------
  function onStepIdChange(index, newRaw) {
    const newId = newRaw.trim();
    const steps = editing.workflow.steps;
    const oldId = steps[index].id;
    steps[index].id = newId;
    if (oldId && newId && oldId !== newId) {
      // Update all references to the old id (next, option goto).
      for (const s of steps) {
        if (!s) continue;
        if (s.type === 'decision' && Array.isArray(s.options)) {
          for (const opt of s.options) {
            if (opt.goto === oldId) opt.goto = newId;
          }
        } else if (s.next === oldId) {
          s.next = newId;
        }
      }
    }
    // re-render so dropdowns refresh; focus is preserved.
    render();
  }

  function onStepTypeChange(index, newType) {
    const step = editing.workflow.steps[index];
    step.type = newType;
    if (newType === 'decision') {
      delete step.next;
      if (!Array.isArray(step.options) || step.options.length === 0) {
        step.options = [
          { label: 'Yes', goto: 'end' },
          { label: 'No',  goto: 'end' },
        ];
      }
    } else {
      delete step.options;
    }
    render();
  }

  function moveStep(index, direction) {
    const steps = editing.workflow.steps;
    const j = index + direction;
    if (j < 0 || j >= steps.length) return;
    const tmp = steps[index];
    steps[index] = steps[j];
    steps[j] = tmp;
    render();
  }

  function deleteStep(index) {
    const steps = editing.workflow.steps;
    if (steps.length <= 1) return;
    steps.splice(index, 1);
    render();
  }

  function onAddStep() {
    const steps = editing.workflow.steps;
    const existing = new Set(steps.map((s) => s && s.id).filter(Boolean));
    let n = steps.length + 1;
    let newId = 's' + n;
    while (existing.has(newId)) {
      n++;
      newId = 's' + n;
    }
    steps.push({ id: newId, type: 'action', label: '' });
    render();
  }

  // ---------- Validation panel ----------
  function renderValidation() {
    const e = E();
    e.validation.innerHTML = '';
    if (!editing.workflow) return;
    let v;
    try {
      v = validateWorkflow(editing.workflow);
    } catch (err) {
      v = { errors: [{ message: 'Validator error: ' + err.message }], warnings: [] };
    }
    for (const err of v.errors) {
      const d = document.createElement('div');
      d.className = 'ed-issue error';
      const prefix = err.stepId ? err.stepId + ': ' : (Array.isArray(err.stepIds) ? err.stepIds.join(', ') + ': ' : '');
      d.textContent = prefix + err.message;
      e.validation.appendChild(d);
    }
    for (const w of v.warnings) {
      const d = document.createElement('div');
      d.className = 'ed-issue warning';
      d.textContent = w.message;
      e.validation.appendChild(d);
    }
    e.save.disabled = v.errors.length > 0;
    e.save.title = v.errors.length ? 'Fix errors to enable Save' : 'Save the workflow';
  }

  // (Read-only preview pane and renderer removed; the Canvas tab is the
  //  interactive visual editor. See git history for the deleted code.)


  // ---------- Raw JSON tab ----------
  function onJsonInput() {
    const e = E();
    try {
      const parsed = JSON.parse(e.jsonText.value);
      editing.workflow = parsed;
      e.jsonStatus.textContent = 'JSON parses cleanly.';
      e.jsonStatus.className = 'ed-json-status ok';
      renderValidation();
      renderPreview();
    } catch (err) {
      e.jsonStatus.textContent = 'JSON parse error — ' + err.message;
      e.jsonStatus.className = 'ed-json-status err';
    }
  }

  // ---------- Save / Save As / Cancel / Delete ----------
  async function postWorkflow(workflow, originalFile) {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, originalFile }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  let saveStatusTimer = null;
  function showSaveStatus(kind, msg) {
    const el = E().saveStatus;
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.toggle('err', kind === 'error');
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    if (kind === 'success') {
      saveStatusTimer = setTimeout(() => el.classList.add('hidden'), 3000);
    }
  }

  async function onSave(closeAfter) {
    if (editing.tab === 'json') {
      try {
        editing.workflow = JSON.parse(E().jsonText.value);
      } catch (err) {
        showSaveStatus('error', 'JSON parse error — ' + err.message);
        return;
      }
    }
    if (!ID_RE.test(editing.workflow.id || '')) {
      showSaveStatus('error', 'Invalid workflow id (use letters, digits, hyphen, underscore — must start with a letter or digit).');
      return;
    }
    const v = validateWorkflow(editing.workflow);
    if (v.errors.length) {
      showSaveStatus('error', `Can't save: ${v.errors.length} validation error${v.errors.length === 1 ? '' : 's'}. Check the panel above.`);
      return;
    }
    const r = await postWorkflow(editing.workflow, editing.originalFile);
    if (!r.ok) {
      showSaveStatus('error', 'Save failed: ' + ((r.data && r.data.error) || ('HTTP ' + r.status)));
      return;
    }
    editing.originalFile = (r.data && r.data.file) || (editing.workflow.id + '.json');
    showSaveStatus('success', '✓ Saved');
    if (closeAfter) {
      hide(true);
    } else if (globalThis.WfrApp && globalThis.WfrApp.refreshSilent) {
      // Keep the editor open — just refresh the workflow list in the
      // background so the picker reflects renames / new files.
      globalThis.WfrApp.refreshSilent(editing.workflow.id);
    }
  }

  async function onSaveAs() {
    const suggested = (editing.workflow.id || 'workflow') + '-copy';
    const newId = prompt('Save as new workflow id:', uniqueIdFromBase(suggested));
    if (!newId) return;
    if (!ID_RE.test(newId)) {
      alert('Invalid id: 1–64 chars, letters/digits/hyphen/underscore, starts with letter/digit.');
      return;
    }
    const copy = deepCopy(editing.workflow);
    copy.id = newId;
    if (copy.title === editing.workflow.title) {
      copy.title = (copy.title || newId) + ' (copy)';
    }
    const v = validateWorkflow(copy);
    if (v.errors.length) {
      alert('Cannot save: workflow has validation errors. Fix them first.');
      return;
    }
    const r = await postWorkflow(copy, null);
    if (!r.ok) {
      alert('Save failed: ' + ((r.data && r.data.error) || ('HTTP ' + r.status)));
      return;
    }
    editing.workflow = copy;
    editing.originalFile = (r.data && r.data.file) || (newId + '.json');
    hide(true);
  }

  function onCancel() {
    if (!confirm('Discard changes?')) return;
    hide(false);
  }

  async function onDelete() {
    if (!editing.originalFile) {
      // Unsaved → just discard.
      hide(false);
      return;
    }
    const label = editing.workflow.title || editing.workflow.id;
    if (!confirm(`Delete "${label}"?\nThis removes ${editing.originalFile} from the workflows/ folder.`)) return;
    try {
      const res = await fetch('/api/workflows/' + encodeURIComponent(editing.originalFile), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert('Delete failed: ' + (data.error || ('HTTP ' + res.status)));
        return;
      }
      editing.workflow = null;
      editing.originalFile = null;
      hide(true);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  // ---------- Exports ----------
  globalThis.WfrEditor = {
    enterEdit,
    enterNew,
    enterDuplicate,
    isActive: () => editing.active,
  };
})();
