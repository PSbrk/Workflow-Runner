// Workflow canvas editor — free-positioning drag-and-drop.
//
// Each step has a `position: {x, y}` (the centre of its shape). The canvas
// renders shapes and connector edges as SVG. Interactions:
//
//   • Drag a shape body to move it.
//   • Drag the "+" handle on a shape to another shape (or the END node) to
//     create a connection. Releasing on empty space cancels.
//   • Click an edge to select it; press Delete to remove it.
//   • Double-click a shape to edit its label; same for an edge's option label.
//   • Click the "✕" handle on a shape to delete it (with confirmation).
//
// Auto type behaviour:
//   - Action with 1 outgoing edge → stays Action.
//   - Adding a 2nd outgoing edge to an Action auto-converts it to Decision
//     (and prompts for option labels).
//   - Wait can have at most 1 outgoing edge; attempting a 2nd is rejected.
//   - Decision: any number of options.
//
// Public API (globalThis.WfrEditorCanvas):
//   init(workflow, svg, palette, idInput, titleInput, validationEl, onChange)
//   redraw()        — call after external workflow mutations
//   destroy()       — detach handlers (called when leaving Canvas tab)

(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

  const SHAPE = {
    action:   { w: 180, h: 80,  half: { w: 90, h: 40 } },
    decision: { w: 150, h: 150, half: { w: 75, h: 75 } },
    wait:     { w: 140, h: 140, half: { w: 70, h: 70 } },
    end:      { w: 90,  h: 40,  half: { w: 45, h: 20 } },
  };

  const cv = {
    workflow:    null,
    svg:         null,
    paletteEl:   null,
    idInput:     null,
    titleInput:  null,
    validationEl: null,
    onChange:    null,
    selectedNode: null,
    selectedEdge: null,        // { sourceId, edgeIdx } or null
    drag:        null,         // { kind, ... }
    bound:       false,
    handlers:    null,         // bound handlers for removal
  };

  // -------------------- Lifecycle --------------------
  function init(workflow, svg, paletteEl, idInput, titleInput, validationEl, onChange) {
    cv.workflow     = workflow;
    cv.svg          = svg;
    cv.paletteEl    = paletteEl;
    cv.idInput      = idInput;
    cv.titleInput   = titleInput;
    cv.validationEl = validationEl;
    cv.onChange     = onChange || (() => {});

    ensurePositions();
    syncMetaInputs();
    bindHandlers();
    render();
  }

  function destroy() {
    unbindHandlers();
    cv.workflow = null;
    cv.svg = null;
  }

  function redraw() { render(); }

  // -------------------- Position management --------------------
  function ensurePositions() {
    const wf = cv.workflow;
    if (!wf || !Array.isArray(wf.steps)) return;

    const byId = Object.create(null);
    wf.steps.forEach((s) => { if (s && s.id) byId[s.id] = s; });

    // Layout missing positions in flow order, vertically.
    const visited = new Set();
    const order = [];
    function walk(id) {
      if (!id || id === 'end' || visited.has(id) || !byId[id]) return;
      visited.add(id);
      order.push(byId[id]);
      const step = byId[id];
      const succs = step.type === 'decision'
        ? (Array.isArray(step.options) ? step.options.map((o) => o.goto) : [])
        : (step.next !== undefined ? [step.next] : []);
      for (const s of succs) walk(s);
    }
    if (wf.steps.length > 0) walk(wf.steps[0].id);
    for (const s of wf.steps) if (s && s.id && !visited.has(s.id)) order.push(s);

    const startX = 280;
    let y = 80;
    for (const s of order) {
      if (!s.position || typeof s.position.x !== 'number' || typeof s.position.y !== 'number') {
        s.position = { x: startX, y };
        y += 130;
      }
    }
    if (!wf.endPosition || typeof wf.endPosition.x !== 'number') {
      wf.endPosition = { x: startX, y: Math.max(y, 200) };
    }
  }

  // -------------------- Event binding --------------------
  function bindHandlers() {
    if (cv.bound) return;
    cv.bound = true;
    cv.handlers = {
      svgDown:    onSvgMouseDown,
      svgMove:    onSvgMouseMove,
      svgUp:      onSvgMouseUp,
      svgKey:     onSvgKeyDown,
      docKey:     onDocKeyDown,
      meta:       onMetaInput,
      paletteClk: onPaletteClick,
    };
    cv.svg.addEventListener('mousedown', cv.handlers.svgDown);
    cv.svg.addEventListener('mousemove', cv.handlers.svgMove);
    cv.svg.addEventListener('mouseup',   cv.handlers.svgUp);
    cv.svg.addEventListener('keydown',   cv.handlers.svgKey);
    document.addEventListener('keydown', cv.handlers.docKey);
    cv.idInput.addEventListener('input',    cv.handlers.meta);
    cv.titleInput.addEventListener('input', cv.handlers.meta);
    cv.paletteEl.querySelectorAll('[data-shape]').forEach((b) => {
      b.addEventListener('click', cv.handlers.paletteClk);
    });
  }
  function unbindHandlers() {
    if (!cv.bound) return;
    cv.bound = false;
    if (!cv.handlers) return;
    cv.svg.removeEventListener('mousedown', cv.handlers.svgDown);
    cv.svg.removeEventListener('mousemove', cv.handlers.svgMove);
    cv.svg.removeEventListener('mouseup',   cv.handlers.svgUp);
    cv.svg.removeEventListener('keydown',   cv.handlers.svgKey);
    document.removeEventListener('keydown', cv.handlers.docKey);
    cv.idInput.removeEventListener('input',    cv.handlers.meta);
    cv.titleInput.removeEventListener('input', cv.handlers.meta);
    cv.handlers = null;
  }

  function syncMetaInputs() {
    cv.idInput.value    = cv.workflow.id    || '';
    cv.titleInput.value = cv.workflow.title || '';
  }

  function onMetaInput() {
    cv.workflow.id    = cv.idInput.value.trim();
    cv.workflow.title = cv.titleInput.value;
    cv.onChange();
  }

  function onPaletteClick(e) {
    const type = e.currentTarget.getAttribute('data-shape');
    addShape(type);
  }

  // -------------------- Mouse handling --------------------
  function svgPoint(evt) {
    const pt = cv.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = cv.svg.getScreenCTM();
    if (!ctm) return { x: pt.x, y: pt.y };
    const inv = ctm.inverse();
    const r = pt.matrixTransform(inv);
    return { x: r.x, y: r.y };
  }

  function onSvgMouseDown(e) {
    if (e.button !== 0) return; // left only
    cv.svg.focus();
    const target = e.target;
    const nodeGroup = target.closest && target.closest('.node-group');

    // Handle: connection
    if (target.classList && target.classList.contains('conn-handle')) {
      e.preventDefault();
      const stepId = nodeGroup.getAttribute('data-step-id');
      const step = stepById(stepId);
      if (!step) return;
      if (step.type === 'wait' && currentEdgeCount(step) >= 1) {
        flash('Wait steps can only have one outgoing connection.');
        return;
      }
      const handleCenter = getConnHandleCenter(step);
      cv.drag = {
        kind: 'connect',
        stepId,
        startX: handleCenter.x,
        startY: handleCenter.y,
        currentX: handleCenter.x,
        currentY: handleCenter.y,
      };
      render();
      return;
    }

    // Handle: delete shape
    if (target.classList && target.classList.contains('delete-handle')) {
      e.preventDefault();
      const stepId = nodeGroup.getAttribute('data-step-id');
      deleteNode(stepId);
      return;
    }

    // Edge click — select it.
    const edgeGroup = target.closest && target.closest('.edge-group');
    if (edgeGroup) {
      const sourceId = edgeGroup.getAttribute('data-source-id');
      const edgeIdx = parseInt(edgeGroup.getAttribute('data-edge-idx'), 10);
      cv.selectedEdge = { sourceId, edgeIdx };
      cv.selectedNode = null;
      render();
      return;
    }

    // Click an end-node — start moving it.
    const endNodeGroup = target.closest && target.closest('.end-node-group');
    if (endNodeGroup) {
      const pt = svgPoint(e);
      cv.drag = {
        kind: 'move-end',
        startX: cv.workflow.endPosition.x,
        startY: cv.workflow.endPosition.y,
        offX: pt.x - cv.workflow.endPosition.x,
        offY: pt.y - cv.workflow.endPosition.y,
      };
      cv.selectedNode = '__end__';
      cv.selectedEdge = null;
      render();
      return;
    }

    // Node body click → select and start move.
    if (nodeGroup) {
      const stepId = nodeGroup.getAttribute('data-step-id');
      const step = stepById(stepId);
      if (!step) return;
      cv.selectedNode = stepId;
      cv.selectedEdge = null;
      const pt = svgPoint(e);
      cv.drag = {
        kind: 'move',
        stepId,
        offX: pt.x - step.position.x,
        offY: pt.y - step.position.y,
        moved: false,
      };
      render();
      return;
    }

    // Click on the empty canvas — deselect.
    cv.selectedNode = null;
    cv.selectedEdge = null;
    render();
  }

  function onSvgMouseMove(e) {
    if (!cv.drag) return;
    const pt = svgPoint(e);
    if (cv.drag.kind === 'move') {
      const step = stepById(cv.drag.stepId);
      if (!step) return;
      step.position.x = pt.x - cv.drag.offX;
      step.position.y = pt.y - cv.drag.offY;
      cv.drag.moved = true;
      render(); // re-render to update edges
    } else if (cv.drag.kind === 'move-end') {
      cv.workflow.endPosition.x = pt.x - cv.drag.offX;
      cv.workflow.endPosition.y = pt.y - cv.drag.offY;
      render();
    } else if (cv.drag.kind === 'connect') {
      cv.drag.currentX = pt.x;
      cv.drag.currentY = pt.y;
      renderTempEdge();
    }
  }

  function onSvgMouseUp(e) {
    if (!cv.drag) return;
    if (cv.drag.kind === 'connect') {
      // Determine drop target.
      const target = e.target;
      const nodeGroup = target.closest && target.closest('.node-group');
      const endGroup  = target.closest && target.closest('.end-node-group');
      let targetId = null;
      if (endGroup) targetId = 'end';
      else if (nodeGroup) targetId = nodeGroup.getAttribute('data-step-id');
      if (targetId) {
        const sourceId = cv.drag.stepId;
        if (targetId !== sourceId || true /* self-loops allowed */) {
          createConnection(sourceId, targetId);
        }
      }
    }
    cv.drag = null;
    render();
    cv.onChange();
  }

  function onSvgKeyDown(e)  { handleKey(e); }
  function onDocKeyDown(e) {
    if (cv.svg && document.activeElement === cv.svg) return; // svgKey already handles
    if (!isCanvasVisible()) return;
    handleKey(e);
  }
  function handleKey(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't delete when typing in an input.
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      if (cv.selectedEdge) {
        const { sourceId, edgeIdx } = cv.selectedEdge;
        deleteEdge(sourceId, edgeIdx);
        cv.selectedEdge = null;
        e.preventDefault();
      } else if (cv.selectedNode && cv.selectedNode !== '__end__') {
        deleteNode(cv.selectedNode);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      cv.selectedNode = null;
      cv.selectedEdge = null;
      cv.drag = null;
      render();
    }
  }

  function isCanvasVisible() {
    const c = document.getElementById('ed-canvas');
    return c && !c.classList.contains('hidden');
  }

  // -------------------- Operations on the workflow --------------------
  function addShape(type) {
    const wf = cv.workflow;
    const existing = new Set(wf.steps.map((s) => s && s.id).filter(Boolean));
    let n = wf.steps.length + 1;
    let id = 's' + n;
    while (existing.has(id)) { n++; id = 's' + n; }
    const center = findFreeSpot();
    const step = {
      id,
      type,
      label: '',
      position: { x: center.x, y: center.y },
    };
    if (type === 'decision') step.options = [];
    wf.steps.push(step);
    cv.selectedNode = id;
    cv.selectedEdge = null;
    cv.onChange();
    render();
    // Immediately open inline editor for the new shape's label.
    setTimeout(() => editShapeLabel(id), 0);
  }

  function findFreeSpot() {
    const rect = cv.svg.getBoundingClientRect();
    const w = rect.width || 600;
    const h = rect.height || 500;
    // Try centre first; if occupied, walk around in a grid.
    const candidates = [
      { x: w / 2, y: h / 2 },
      { x: w / 2 + 200, y: h / 2 },
      { x: w / 2 - 200, y: h / 2 },
      { x: w / 2, y: h / 2 + 160 },
      { x: w / 2, y: h / 2 - 160 },
    ];
    for (const c of candidates) {
      if (!overlapsExistingShape(c.x, c.y)) return c;
    }
    // Fallback: top-left + offset by step count.
    return { x: 200 + 20 * cv.workflow.steps.length, y: 200 + 20 * cv.workflow.steps.length };
  }

  function overlapsExistingShape(x, y) {
    const MIN_DIST = 120;
    for (const s of cv.workflow.steps) {
      if (!s || !s.position) continue;
      const dx = s.position.x - x;
      const dy = s.position.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_DIST) return true;
    }
    return false;
  }

  function deleteNode(stepId) {
    const wf = cv.workflow;
    const step = stepById(stepId);
    if (!step) return;
    if (!confirm(`Delete step "${step.label || step.id}"?`)) return;
    // Remove the step.
    const idx = wf.steps.findIndex((s) => s.id === stepId);
    if (idx >= 0) wf.steps.splice(idx, 1);
    // Remove any references to it from other steps.
    for (const s of wf.steps) {
      if (s.type === 'decision' && Array.isArray(s.options)) {
        s.options = s.options.filter((o) => o.goto !== stepId);
      } else if (s.next === stepId) {
        delete s.next;
      }
    }
    cv.selectedNode = null;
    cv.onChange();
    render();
  }

  function currentEdgeCount(step) {
    if (step.type === 'decision') return Array.isArray(step.options) ? step.options.length : 0;
    return Object.prototype.hasOwnProperty.call(step, 'next') && step.next !== undefined ? 1 : 0;
  }

  function createConnection(sourceId, targetId) {
    const source = stepById(sourceId);
    if (!source) return;
    if (source.type === 'wait') {
      if (currentEdgeCount(source) >= 1) {
        flash('Wait steps can only have one outgoing connection.');
        return;
      }
      source.next = targetId;
    } else if (source.type === 'action') {
      const count = currentEdgeCount(source);
      if (count === 0) {
        source.next = targetId;
      } else {
        // Adding a second edge to an Action auto-converts it to a Decision.
        const firstTarget = source.next;
        const firstLabel = prompt('Label for the existing branch (e.g. "Yes"):', 'Option 1');
        if (firstLabel === null) return;
        const secondLabel = prompt('Label for the new branch (e.g. "No"):', 'Option 2');
        if (secondLabel === null) return;
        source.type = 'decision';
        delete source.next;
        source.options = [
          { label: firstLabel || 'Option 1', goto: firstTarget },
          { label: secondLabel || 'Option 2', goto: targetId },
        ];
      }
    } else if (source.type === 'decision') {
      const label = prompt('Label for this option:', 'Option ' + (currentEdgeCount(source) + 1));
      if (label === null) return;
      if (!Array.isArray(source.options)) source.options = [];
      source.options.push({ label: label || ('Option ' + (currentEdgeCount(source) + 1)), goto: targetId });
    }
    cv.onChange();
    render();
  }

  function deleteEdge(sourceId, edgeIdx) {
    const source = stepById(sourceId);
    if (!source) return;
    if (source.type === 'decision') {
      if (!Array.isArray(source.options)) return;
      source.options.splice(edgeIdx, 1);
      // If only one option remains, optionally convert to action.
      if (source.options.length === 1) {
        const remaining = source.options[0];
        if (confirm('Only one option remains. Convert this back to a plain action?')) {
          source.type = 'action';
          source.next = remaining.goto;
          delete source.options;
        }
      }
    } else {
      delete source.next;
    }
    cv.onChange();
    render();
  }

  function editShapeLabel(stepId) {
    const step = stepById(stepId);
    if (!step) return;
    const pos = step.position;
    showInlineInput({
      anchorX: pos.x,
      anchorY: pos.y,
      value: step.label || '',
      placeholder: 'Step label',
      onSave: (v) => { step.label = v; cv.onChange(); render(); },
    });
  }

  function editEdgeLabel(sourceId, edgeIdx) {
    const source = stepById(sourceId);
    if (!source || source.type !== 'decision') return;
    const opt = source.options[edgeIdx];
    if (!opt) return;
    // Place input at edge midpoint.
    const sourcePos = source.position;
    const target = opt.goto === 'end' ? cv.workflow.endPosition : (stepById(opt.goto) || {}).position;
    if (!target) return;
    const mx = (sourcePos.x + target.x) / 2;
    const my = (sourcePos.y + target.y) / 2;
    showInlineInput({
      anchorX: mx,
      anchorY: my,
      value: opt.label || '',
      placeholder: 'Option label',
      onSave: (v) => { opt.label = v; cv.onChange(); render(); },
    });
  }

  function editStepId(stepId) {
    const step = stepById(stepId);
    if (!step) return;
    const newId = prompt('Step id:', step.id);
    if (newId === null) return;
    const trimmed = newId.trim();
    if (!ID_RE.test(trimmed)) {
      alert('Invalid id: letters/digits/hyphen/underscore, 1-64 chars, starts with letter/digit.');
      return;
    }
    if (trimmed === step.id) return;
    if (cv.workflow.steps.some((s) => s.id === trimmed)) {
      alert('A step with that id already exists.');
      return;
    }
    const oldId = step.id;
    step.id = trimmed;
    // Update references.
    for (const s of cv.workflow.steps) {
      if (s.type === 'decision' && Array.isArray(s.options)) {
        for (const o of s.options) if (o.goto === oldId) o.goto = trimmed;
      } else if (s.next === oldId) {
        s.next = trimmed;
      }
    }
    if (cv.selectedNode === oldId) cv.selectedNode = trimmed;
    cv.onChange();
    render();
  }

  function showInlineInput({ anchorX, anchorY, value, placeholder, onSave }) {
    // Convert SVG coords to screen coords.
    const ctm = cv.svg.getScreenCTM();
    const pt = cv.svg.createSVGPoint();
    pt.x = anchorX; pt.y = anchorY;
    const screen = pt.matrixTransform(ctm);
    const wrap = cv.svg.parentElement;
    const wrapRect = wrap.getBoundingClientRect();
    const left = screen.x - wrapRect.left - 100;
    const top  = screen.y - wrapRect.top + 0;

    // Remove any existing input.
    const existing = wrap.querySelector('.canvas-inline-edit');
    if (existing) existing.remove();

    const ed = document.createElement('input');
    ed.className = 'canvas-inline-edit';
    ed.type = 'text';
    ed.value = value;
    ed.placeholder = placeholder || '';
    ed.style.left = left + 'px';
    ed.style.top  = top + 'px';
    wrap.appendChild(ed);
    ed.focus();
    ed.select();

    function finish(save) {
      const v = ed.value;
      ed.remove();
      if (save) onSave(v);
    }
    ed.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    ed.addEventListener('blur', () => finish(true));
  }

  // -------------------- Geometry helpers --------------------
  function stepById(id) { return cv.workflow.steps.find((s) => s && s.id === id) || null; }

  function shapeEdgePoint(step, towardX, towardY) {
    const type = step.id === '__end__' ? 'end' : step.type;
    const cx = step.position ? step.position.x : (step._endX || 0);
    const cy = step.position ? step.position.y : (step._endY || 0);
    const sz = SHAPE[type] || SHAPE.action;
    const dx = towardX - cx;
    const dy = towardY - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    if (type === 'decision') {
      const r = Math.min(sz.half.w, sz.half.h);
      const len = Math.sqrt(dx * dx + dy * dy);
      return { x: cx + dx * r / len, y: cy + dy * r / len };
    }
    if (type === 'wait') {
      // Diamond: |x|/halfW + |y|/halfH = 1
      const m = Math.abs(dx) / sz.half.w + Math.abs(dy) / sz.half.h;
      return { x: cx + dx / m, y: cy + dy / m };
    }
    // Rect (action / end)
    const m = Math.max(Math.abs(dx) / sz.half.w, Math.abs(dy) / sz.half.h);
    return { x: cx + dx / m, y: cy + dy / m };
  }

  function getConnHandleCenter(step) {
    const sz = SHAPE[step.type] || SHAPE.action;
    return { x: step.position.x, y: step.position.y + sz.half.h + 16 };
  }

  // -------------------- Rendering --------------------
  function render() {
    // Clear all but <defs>.
    Array.from(cv.svg.querySelectorAll('g, path.edge-temp')).forEach((n) => n.remove());

    if (!cv.workflow || !Array.isArray(cv.workflow.steps)) return;

    const wf = cv.workflow;
    const layer = document.createElementNS(SVG_NS, 'g');
    layer.setAttribute('class', 'canvas-layer');
    cv.svg.appendChild(layer);

    // Edges first (so shapes overlap them).
    renderEdges(layer);

    // Shapes (steps).
    for (const step of wf.steps) {
      if (!step || !step.position) continue;
      renderShape(layer, step);
    }

    // End node.
    renderEndNode(layer);

    // Temp drag edge.
    if (cv.drag && cv.drag.kind === 'connect') renderTempEdge();

    // Resize SVG to fit (so scrolling works for large workflows).
    fitCanvas();

    // Refresh validation panel.
    renderValidation();
  }

  function fitCanvas() {
    if (!cv.workflow) return;
    let maxX = 600, maxY = 500;
    for (const s of cv.workflow.steps) {
      if (s && s.position) {
        maxX = Math.max(maxX, s.position.x + 200);
        maxY = Math.max(maxY, s.position.y + 150);
      }
    }
    if (cv.workflow.endPosition) {
      maxX = Math.max(maxX, cv.workflow.endPosition.x + 200);
      maxY = Math.max(maxY, cv.workflow.endPosition.y + 100);
    }
    cv.svg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);
    cv.svg.style.minHeight = Math.min(maxY, 800) + 'px';
  }

  function renderShape(layer, step) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'node-group' + (cv.selectedNode === step.id ? ' selected' : '') + (cv.drag && cv.drag.kind === 'move' && cv.drag.stepId === step.id ? ' dragging' : ''));
    g.setAttribute('data-step-id', step.id);
    g.setAttribute('transform', `translate(${step.position.x}, ${step.position.y})`);

    const sz = SHAPE[step.type] || SHAPE.action;

    let shapeEl;
    if (step.type === 'action') {
      shapeEl = document.createElementNS(SVG_NS, 'rect');
      shapeEl.setAttribute('x', String(-sz.half.w));
      shapeEl.setAttribute('y', String(-sz.half.h));
      shapeEl.setAttribute('width',  String(sz.w));
      shapeEl.setAttribute('height', String(sz.h));
      shapeEl.setAttribute('rx', '10');
    } else if (step.type === 'decision') {
      shapeEl = document.createElementNS(SVG_NS, 'circle');
      shapeEl.setAttribute('cx', '0');
      shapeEl.setAttribute('cy', '0');
      shapeEl.setAttribute('r', String(Math.min(sz.half.w, sz.half.h)));
    } else if (step.type === 'wait') {
      shapeEl = document.createElementNS(SVG_NS, 'polygon');
      const points = `0,${-sz.half.h} ${sz.half.w},0 0,${sz.half.h} ${-sz.half.w},0`;
      shapeEl.setAttribute('points', points);
    }
    shapeEl.setAttribute('class', 'node-shape ' + step.type);
    g.appendChild(shapeEl);

    // Type tag (top).
    const tag = document.createElementNS(SVG_NS, 'text');
    tag.setAttribute('class', 'node-type-tag');
    tag.setAttribute('x', '0');
    tag.setAttribute('y', String(-sz.half.h + 16));
    tag.setAttribute('text-anchor', 'middle');
    tag.textContent = step.type.toUpperCase();
    g.appendChild(tag);

    // ID (top-right corner-ish).
    const idText = document.createElementNS(SVG_NS, 'text');
    idText.setAttribute('class', 'node-id');
    idText.setAttribute('x', '0');
    idText.setAttribute('y', String(-sz.half.h + 28));
    idText.setAttribute('text-anchor', 'middle');
    idText.textContent = step.id;
    g.appendChild(idText);

    // Label (centered, wrapped).
    const lbl = step.label || '(click to set label)';
    const wrapped = wrapText(lbl, step.type === 'wait' ? 14 : 20, 3);
    const labelG = document.createElementNS(SVG_NS, 'g');
    labelG.setAttribute('class', 'node-label-group');
    const baseY = step.type === 'decision' ? 0 : (step.type === 'wait' ? -2 : 6);
    wrapped.forEach((line, i) => {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'node-label');
      t.setAttribute('x', '0');
      t.setAttribute('y', String(baseY + (i - (wrapped.length - 1) / 2) * 15));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = line;
      labelG.appendChild(t);
    });
    g.appendChild(labelG);

    // Connection "+" handle below the shape.
    const handleY = sz.half.h + 16;
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.setAttribute('class', 'conn-handle');
    handle.setAttribute('cx', '0');
    handle.setAttribute('cy', String(handleY));
    handle.setAttribute('r', '10');
    g.appendChild(handle);
    const handleT = document.createElementNS(SVG_NS, 'text');
    handleT.setAttribute('class', 'conn-handle-text');
    handleT.setAttribute('x', '0');
    handleT.setAttribute('y', String(handleY + 4));
    handleT.textContent = '+';
    g.appendChild(handleT);

    // Delete "✕" handle top-right.
    const delX = sz.half.w + 6;
    const delY = -sz.half.h - 6;
    const delHandle = document.createElementNS(SVG_NS, 'circle');
    delHandle.setAttribute('class', 'delete-handle');
    delHandle.setAttribute('cx', String(delX));
    delHandle.setAttribute('cy', String(delY));
    delHandle.setAttribute('r', '8');
    g.appendChild(delHandle);
    const delT = document.createElementNS(SVG_NS, 'text');
    delT.setAttribute('class', 'delete-handle-text');
    delT.setAttribute('x', String(delX));
    delT.setAttribute('y', String(delY + 4));
    delT.textContent = '✕';
    g.appendChild(delT);

    // Double-click label → inline edit.
    labelG.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      editShapeLabel(step.id);
    });
    // Double-click id → rename.
    idText.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      editStepId(step.id);
    });
    // Shape body double-click → label edit.
    shapeEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      editShapeLabel(step.id);
    });

    layer.appendChild(g);
  }

  function renderEndNode(layer) {
    const wf = cv.workflow;
    if (!wf.endPosition) wf.endPosition = { x: 400, y: 500 };
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'end-node-group' + (cv.selectedNode === '__end__' ? ' selected' : ''));
    g.setAttribute('transform', `translate(${wf.endPosition.x}, ${wf.endPosition.y})`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(-SHAPE.end.half.w));
    rect.setAttribute('y', String(-SHAPE.end.half.h));
    rect.setAttribute('width',  String(SHAPE.end.w));
    rect.setAttribute('height', String(SHAPE.end.h));
    rect.setAttribute('rx', '20');
    rect.setAttribute('class', 'end-node-shape');
    g.appendChild(rect);

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'end-node-text');
    t.setAttribute('x', '0');
    t.setAttribute('y', '4');
    t.textContent = 'END';
    g.appendChild(t);

    layer.appendChild(g);
  }

  function renderEdges(layer) {
    const wf = cv.workflow;
    for (const step of wf.steps) {
      if (!step || !step.position) continue;
      const targets = step.type === 'decision'
        ? (Array.isArray(step.options) ? step.options : [])
        : (step.next !== undefined ? [{ goto: step.next, label: null }] : []);
      targets.forEach((tgt, idx) => {
        const goto = tgt.goto;
        if (!goto) return;
        const targetCenter = goto === 'end'
          ? wf.endPosition
          : (() => { const t = stepById(goto); return t && t.position; })();
        if (!targetCenter) return;
        renderEdge(layer, step, targetCenter, goto, idx, step.type === 'decision' ? tgt.label : null);
      });
    }
  }

  function renderEdge(layer, source, targetCenter, targetId, idx, label) {
    const g = document.createElementNS(SVG_NS, 'g');
    const isSelected = cv.selectedEdge && cv.selectedEdge.sourceId === source.id && cv.selectedEdge.edgeIdx === idx;
    g.setAttribute('class', 'edge-group' + (isSelected ? ' selected' : ''));
    g.setAttribute('data-source-id', source.id);
    g.setAttribute('data-edge-idx',  String(idx));
    layer.appendChild(g);

    const targetShape = targetId === 'end'
      ? { type: 'end', position: cv.workflow.endPosition }
      : stepById(targetId);
    if (!targetShape) return;

    // Compute edge points on each shape's boundary.
    const sourceEdge = shapeEdgePoint(source, targetCenter.x, targetCenter.y);
    const targetEdge = shapeEdgePoint(targetShape, source.position.x, source.position.y);

    // Bezier curve.
    const dx = targetEdge.x - sourceEdge.x;
    const dy = targetEdge.y - sourceEdge.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(60, dist * 0.4);
    // Control points pull outward in the direction of travel for a nice curve.
    const cp1x = sourceEdge.x + (dy === 0 ? 0 : (dy > 0 ? 0 : -curvature) * 0.5);
    const cp1y = sourceEdge.y + curvature * Math.sign(dy || 1);
    const cp2x = targetEdge.x - (dy === 0 ? 0 : (dy > 0 ? 0 : -curvature) * 0.5);
    const cp2y = targetEdge.y - curvature * Math.sign(dy || 1);

    const d = `M ${sourceEdge.x} ${sourceEdge.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetEdge.x} ${targetEdge.y}`;

    // A wide invisible hit path for easier selection.
    const hit = document.createElementNS(SVG_NS, 'path');
    hit.setAttribute('class', 'edge-hit');
    hit.setAttribute('d', d);
    g.appendChild(hit);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'edge-path');
    path.setAttribute('d', d);
    path.setAttribute('marker-end', 'url(#cv-arrow)');
    g.appendChild(path);

    // Label (decision options).
    if (label) {
      const lblText = document.createElementNS(SVG_NS, 'text');
      lblText.setAttribute('class', 'edge-label-text');
      lblText.setAttribute('x', String((sourceEdge.x + targetEdge.x) / 2));
      lblText.setAttribute('y', String((sourceEdge.y + targetEdge.y) / 2));
      lblText.setAttribute('text-anchor', 'middle');
      lblText.setAttribute('dominant-baseline', 'middle');
      lblText.textContent = label.length > 22 ? label.slice(0, 21) + '…' : label;
      // Background rect.
      g.appendChild(lblText);
      const bb = lblText.getBBox();
      const bg = document.createElementNS(SVG_NS, 'rect');
      bg.setAttribute('class', 'edge-label-bg');
      bg.setAttribute('x', String(bb.x - 4));
      bg.setAttribute('y', String(bb.y - 2));
      bg.setAttribute('width',  String(bb.width + 8));
      bg.setAttribute('height', String(bb.height + 4));
      bg.setAttribute('rx', '4');
      g.insertBefore(bg, lblText);

      // Double-click label → edit.
      const editHandler = (e) => { e.stopPropagation(); editEdgeLabel(source.id, idx); };
      lblText.addEventListener('dblclick', editHandler);
      bg.addEventListener('dblclick', editHandler);
    }
  }

  function renderTempEdge() {
    // Remove old temp.
    const old = cv.svg.querySelector('.edge-temp');
    if (old) old.remove();
    if (!cv.drag || cv.drag.kind !== 'connect') return;
    const source = stepById(cv.drag.stepId);
    if (!source) return;
    const targetX = cv.drag.currentX;
    const targetY = cv.drag.currentY;
    const sourceEdge = shapeEdgePoint(source, targetX, targetY);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'edge-temp');
    const dx = targetX - sourceEdge.x;
    const dy = targetY - sourceEdge.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const c = Math.min(60, dist * 0.4);
    const d = `M ${sourceEdge.x} ${sourceEdge.y} C ${sourceEdge.x} ${sourceEdge.y + c}, ${targetX} ${targetY - c}, ${targetX} ${targetY}`;
    path.setAttribute('d', d);
    path.setAttribute('marker-end', 'url(#cv-arrow)');
    cv.svg.appendChild(path);
  }

  function wrapText(text, maxChars, maxLines) {
    if (!text) return [''];
    if (text.length <= maxChars) return [text];
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const join = cur ? cur + ' ' + w : w;
      if (join.length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = join;
      }
      if (lines.length === maxLines) break;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
      // Trailing ellipsis.
      const last = lines[lines.length - 1];
      lines[lines.length - 1] = last.length > maxChars - 1 ? last.slice(0, maxChars - 1) + '…' : last + '…';
    }
    return lines;
  }

  function renderValidation() {
    cv.validationEl.innerHTML = '';
    let v;
    try { v = validateWorkflow(cv.workflow); }
    catch (e) { v = { errors: [{ message: 'Validator error: ' + e.message }], warnings: [] }; }
    for (const err of v.errors) {
      const d = document.createElement('div');
      d.className = 'ed-issue error';
      const pref = err.stepId ? err.stepId + ': ' : (Array.isArray(err.stepIds) ? err.stepIds.join(', ') + ': ' : '');
      d.textContent = pref + err.message;
      cv.validationEl.appendChild(d);
    }
    for (const w of v.warnings) {
      const d = document.createElement('div');
      d.className = 'ed-issue warning';
      d.textContent = w.message;
      cv.validationEl.appendChild(d);
    }
  }

  function flash(msg) {
    // Lightweight inline notice — reuses the validation panel.
    const d = document.createElement('div');
    d.className = 'ed-issue warning';
    d.textContent = msg;
    cv.validationEl.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 2500);
  }

  // -------------------- Exports --------------------
  globalThis.WfrEditorCanvas = { init, destroy, redraw };
})();
