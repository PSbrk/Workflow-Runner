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
    previewHidden: false, // user dismissed the right-hand preview pane
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
      closePreview:   document.getElementById('ed-close-preview'),
      showPreview:    document.getElementById('ed-show-preview'),
      previewPane:    document.querySelector('#edit-view .preview-pane'),
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
      previewSteps:   document.getElementById('preview-steps'),
      previewArrows:  document.getElementById('preview-arrows'),
      previewEnd:     document.getElementById('preview-end-node'),
      previewCanvas:  document.getElementById('preview-canvas'),
      previewMsg:     document.getElementById('preview-msg'),
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
    editing.previewHidden = false;
    show();
  }

  function enterNew() {
    editing.active = true;
    editing.workflow = blankWorkflow(uniqueIdFromBase('new-workflow'));
    editing.originalFile = null;
    editing.tab = 'canvas';
    editing.previewHidden = false;
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
    editing.previewHidden = false;
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
    if (e.closePreview) e.closePreview.addEventListener('click', () => {
      editing.previewHidden = true;
      render();
    });
    if (e.showPreview)  e.showPreview.addEventListener('click', () => {
      editing.previewHidden = false;
      render();
    });
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

    // Preview pane visibility: hidden on Canvas (the canvas is itself the
    // visual editor) and hidden when the user dismissed it with its X. When
    // dismissed on Form / Raw JSON, surface a "Show preview" button so the
    // user can bring it back.
    const previewVisible = editing.tab !== 'canvas' && !editing.previewHidden;
    if (e.editSplit) e.editSplit.classList.toggle('canvas-only', !previewVisible);
    if (e.showPreview) {
      const showButton = editing.tab !== 'canvas' && editing.previewHidden;
      e.showPreview.classList.toggle('hidden', !showButton);
    }
  }

  // ---------- Render orchestration ----------
  function render() {
    captureFocusAndRun(() => {
      updateTabUI();
      if (editing.tab === 'form') buildForm();
      if (editing.tab === 'canvas') initCanvasIfNeeded();
      renderValidation();
      // Skip preview render while on canvas — pane is hidden then anyway.
      if (editing.tab !== 'canvas') renderPreview();
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

  // ---------- Preview rendering ----------
  function renderPreview() {
    const e = E();
    e.previewSteps.innerHTML = '';
    Array.from(e.previewArrows.querySelectorAll('path, text, rect')).forEach((n) => n.remove());
    e.previewEnd.classList.add('hidden');
    e.previewMsg.classList.add('hidden');
    e.previewMsg.textContent = '';
    e.previewCanvas.style.width = '';
    e.previewCanvas.style.height = '';

    const wf = editing.workflow;
    if (!wf || !Array.isArray(wf.steps) || wf.steps.length === 0) {
      e.previewMsg.classList.remove('hidden');
      e.previewMsg.textContent = 'Add a step to see the preview.';
      e.previewMsg.style.color = 'var(--muted)';
      e.previewMsg.style.background = '#f9fafb';
      e.previewMsg.style.borderTop = '1px solid #e5e7eb';
      return;
    }

    const BOX_W = 280, GAP = 30, PAD_X = 140, PAD_Y = 20;
    const canvasW = BOX_W + PAD_X * 2;
    const centerX = canvasW / 2 - BOX_W / 2;

    const positions = {};
    let y = PAD_Y;

    // Lay out steps in DFS-from-start order, then any unreachable steps in
    // array order — same as the runner.
    const orderedSteps = previewFlowOrder(wf);

    orderedSteps.forEach((step) => {
      if (!step || typeof step !== 'object') return;
      const div = document.createElement('div');
      div.className = 'step pending';
      div.style.position = 'absolute';
      div.style.left = centerX + 'px';
      div.style.top = y + 'px';
      div.style.width = BOX_W + 'px';

      const top = document.createElement('div');
      top.className = 'row-top';
      const tag = document.createElement('span');
      tag.className = 'type-tag';
      tag.textContent = step.type || 'action';
      const idTag = document.createElement('span');
      idTag.className = 'id-tag';
      idTag.textContent = step.id || '(no id)';
      top.appendChild(tag);
      top.appendChild(idTag);
      div.appendChild(top);

      const lbl = document.createElement('div');
      lbl.className = 'label';
      lbl.textContent = step.label || '(no label)';
      div.appendChild(lbl);

      if (step.type === 'decision' && Array.isArray(step.options) && step.options.length) {
        const list = document.createElement('div');
        list.className = 'state-text';
        list.textContent = 'Options: ' + step.options.map((o) => o.label || '?').join(', ');
        div.appendChild(list);
      }

      e.previewSteps.appendChild(div);
      const h = div.offsetHeight || 80;
      if (step.id) positions[step.id] = { x: centerX, y, w: BOX_W, h };
      y += h + GAP;
    });

    const endY = y + 16;
    e.previewEnd.classList.remove('hidden');
    e.previewEnd.style.position = 'absolute';
    e.previewEnd.style.left = (centerX + BOX_W / 2 - 30) + 'px';
    e.previewEnd.style.top = endY + 'px';
    positions['end'] = { x: centerX + BOX_W / 2 - 30, y: endY, w: 60, h: 30 };

    const totalH = endY + 60;
    e.previewCanvas.style.width = canvasW + 'px';
    e.previewCanvas.style.height = totalH + 'px';
    e.previewArrows.setAttribute('width', String(canvasW));
    e.previewArrows.setAttribute('height', String(totalH));
    e.previewArrows.setAttribute('viewBox', `0 0 ${canvasW} ${totalH}`);

    drawPreviewArrows(wf, positions, e.previewArrows, canvasW);
  }

  function previewFlowOrder(wf) {
    if (!wf || !Array.isArray(wf.steps) || wf.steps.length === 0) return [];
    const byId = Object.create(null);
    const indexById = Object.create(null);
    wf.steps.forEach((s, i) => { if (s && s.id) { byId[s.id] = s; indexById[s.id] = i; } });

    function defaultNext(id) {
      const idx = indexById[id];
      if (idx == null) return 'end';
      if (idx + 1 < wf.steps.length) return (wf.steps[idx + 1] && wf.steps[idx + 1].id) || 'end';
      return 'end';
    }
    function successors(s) {
      if (!s || !s.id) return [];
      if (s.type === 'decision') return (Array.isArray(s.options) ? s.options : []).map((o) => o.goto);
      if (Object.prototype.hasOwnProperty.call(s, 'next') && s.next !== undefined && s.next !== '') return [s.next];
      return [defaultNext(s.id)];
    }

    const visited = new Set();
    const order = [];
    function walk(id) {
      if (!id || id === 'end' || visited.has(id) || !byId[id]) return;
      visited.add(id);
      order.push(byId[id]);
      for (const n of successors(byId[id])) walk(n);
    }
    walk(wf.steps[0].id);
    for (const s of wf.steps) {
      if (s && s.id && !visited.has(s.id)) order.push(s);
    }
    return order;
  }

  function shortLabel(s, max) {
    s = String(s == null ? '' : s);
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trimEnd() + '…';
  }

  function arrowCrossesBoxes(from, to, positions, fromId, toId) {
    if (to.y <= from.y) return false; // backward arrows side-route already
    const topY = from.y + from.h;
    const botY = to.y;
    for (const id in positions) {
      if (id === 'end' || id === fromId || id === toId) continue;
      const p = positions[id];
      if (!p) continue;
      if (p.y + p.h > topY && p.y < botY) return true;
    }
    return false;
  }

  function drawPreviewArrows(wf, positions, svg, canvasW) {
    const indexById = {};
    wf.steps.forEach((s, i) => { if (s && s.id) indexById[s.id] = i; });

    function defaultNext(id) {
      const idx = indexById[id];
      if (idx == null) return 'end';
      if (idx + 1 < wf.steps.length) return (wf.steps[idx + 1] && wf.steps[idx + 1].id) || 'end';
      return 'end';
    }

    function successors(s) {
      if (!s || !s.id) return [];
      if (s.type === 'decision') {
        return (Array.isArray(s.options) ? s.options : []).map((o) => ({ to: o.goto, label: o.label }));
      }
      if (Object.prototype.hasOwnProperty.call(s, 'next') && s.next !== undefined && s.next !== '') {
        return [{ to: s.next, label: null }];
      }
      return [{ to: defaultNext(s.id), label: null }];
    }

    const SIDE_BASE_X = canvasW - 30;
    const SIDE_TRACK_SPACING = 18;
    const LEAD = 14;
    let sideTrack = 0;

    for (const step of wf.steps) {
      if (!step || !step.id) continue;
      const outs = successors(step);
      let stepSideIdx = 0;
      outs.forEach((edge, idx, arr) => {
        const from = positions[step.id];
        const to = positions[edge.to];
        if (!from || !to) return;

        let sx;
        if (arr.length === 1) sx = from.x + from.w / 2;
        else {
          const spread = Math.min(from.w - 40, 40 * (arr.length - 1));
          const start = from.x + from.w / 2 - spread / 2;
          sx = start + spread * (idx / Math.max(1, arr.length - 1));
        }
        const sy = from.y + from.h;
        const tx = to.x + to.w / 2;
        const ty = to.y;
        const isBackward = to.y < from.y;
        const crossesBoxes = !isBackward && arrowCrossesBoxes(from, to, positions, step.id, edge.to);
        const sideRoute = isBackward || crossesBoxes;
        let sideX = null;
        let labelYOverride = null;
        if (sideRoute) {
          sideX = SIDE_BASE_X - sideTrack * SIDE_TRACK_SPACING;
          sideTrack++;
          labelYOverride = sy + LEAD + 8 + stepSideIdx * 20;
          stepSideIdx++;
        }

        let d;
        if (sideRoute) {
          const dipY = sy + LEAD;
          const arrY = ty - LEAD;
          d =
            `M ${sx} ${sy}` +
            ` L ${sx} ${dipY}` +
            ` L ${sideX} ${dipY}` +
            ` L ${sideX} ${arrY}` +
            ` L ${tx} ${arrY}` +
            ` L ${tx} ${ty - 6}`;
        } else {
          const dy = ty - sy;
          if (Math.abs(sx - tx) < 2 && dy > 0 && dy < 200) {
            d = `M ${sx} ${sy} L ${tx} ${ty - 6}`;
          } else {
            d = `M ${sx} ${sy} C ${sx} ${sy + Math.max(16, dy / 2)}, ${tx} ${ty - Math.max(16, dy / 2)}, ${tx} ${ty - 6}`;
          }
        }

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', sideRoute ? 'arrow-loop' : 'arrow-default');
        path.setAttribute('marker-end', 'url(#pv-arrowhead)');
        svg.appendChild(path);

        if (edge.label) {
          const lx = sideRoute ? (sideX + 6) : ((sx + tx) / 2 + 8);
          const ly = sideRoute ? labelYOverride : ((sy + ty) / 2);
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', lx);
          text.setAttribute('y', ly);
          text.setAttribute('class', 'arrow-label');
          text.setAttribute('dominant-baseline', 'middle');
          const display = shortLabel(edge.label, 24);
          text.textContent = display;
          if (display !== edge.label) {
            const t = document.createElementNS(SVG_NS, 'title');
            t.textContent = edge.label;
            text.appendChild(t);
          }
          svg.appendChild(text);
          try {
            const bb = text.getBBox();
            const rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', String(bb.x - 4));
            rect.setAttribute('y', String(bb.y - 2));
            rect.setAttribute('width', String(bb.width + 8));
            rect.setAttribute('height', String(bb.height + 4));
            rect.setAttribute('rx', '4');
            rect.setAttribute('class', 'arrow-label-bg');
            svg.insertBefore(rect, text);
          } catch (_) {}
        }
      });
    }
  }

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
