// Instance store. Templates live in workflows/<id>.json on disk; instances
// live in localStorage. Each instance is a snapshot of a template's steps[]
// plus its own per-instance run state (trail, choices, cursor) so future
// edits to the template don't disturb running instances.

(function () {
  const LS_PREFIX = 'wfri:';
  const LS_OPEN   = 'wfri-open';   // id of the currently-open instance

  function uuid() {
    // Personal-use UUID. Time + 64-bit random — plenty for one machine.
    return 'i-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function listIds() {
    const ids = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LS_PREFIX) && key.length > LS_PREFIX.length) {
        ids.push(key.slice(LS_PREFIX.length));
      }
    }
    return ids;
  }

  function load(id) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + id);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || obj.id !== id) return null;
      return obj;
    } catch (e) { return null; }
  }

  function save(instance) {
    if (!instance || !instance.id) return;
    try {
      localStorage.setItem(LS_PREFIX + instance.id, JSON.stringify(instance));
    } catch (e) { /* quota — ignore */ }
  }

  function remove(id) {
    localStorage.removeItem(LS_PREFIX + id);
    if (getOpenId() === id) setOpenId(null);
  }

  function getOpenId() { return localStorage.getItem(LS_OPEN); }
  function setOpenId(id) {
    if (id == null) localStorage.removeItem(LS_OPEN);
    else localStorage.setItem(LS_OPEN, id);
  }

  function listAll() {
    return listIds().map(load).filter(Boolean).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  function create(template, title) {
    if (!template || !Array.isArray(template.steps) || template.steps.length === 0) {
      throw new Error('Template has no steps');
    }
    const inst = {
      id: uuid(),
      title: (title || '').trim() || ('Instance of ' + (template.title || template.id)),
      templateId: template.id,
      templateTitle: template.title || template.id,
      // Deep-copy the steps so later template edits don't bleed in.
      steps: JSON.parse(JSON.stringify(template.steps)),
      trail: [],
      choices: {},
      cursor: template.steps[0].id,
      completedAcknowledged: false,
      createdAt: Date.now(),
    };
    save(inst);
    return inst;
  }

  function resetProgress(instance) {
    if (!instance || !Array.isArray(instance.steps) || instance.steps.length === 0) return;
    instance.trail = [];
    instance.choices = {};
    instance.cursor = instance.steps[0].id;
    instance.completedAcknowledged = false;
    save(instance);
  }

  function rename(instance, newTitle) {
    if (!instance) return;
    instance.title = (newTitle || '').trim() || instance.title;
    save(instance);
  }

  globalThis.WfrInstances = {
    listAll, load, save, remove, create,
    getOpenId, setOpenId, resetProgress, rename,
  };
})();
