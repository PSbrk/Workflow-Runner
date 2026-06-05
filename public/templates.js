// Template store — browser-only. In this Option D variant the app runs
// entirely client-side, so templates live in localStorage under wft:<id>
// instead of as files on disk served by a Python backend.
//
// On first launch (no wft-bootstrapped flag), the store seeds itself from
// globalThis.WfrBuiltinTemplates — the workflows shipped with the bundle
// in public/builtin-workflows.js. After that the user is in charge: they
// can edit, create, delete, and import/export templates freely.

(function () {
  const LS_PREFIX    = 'wft:';
  const LS_BOOTSTRAP = 'wft-bootstrapped';

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
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function save(workflow) {
    if (!workflow || !workflow.id) return false;
    try {
      localStorage.setItem(LS_PREFIX + workflow.id, JSON.stringify(workflow));
      return true;
    } catch (e) { return false; }
  }

  function remove(id) {
    localStorage.removeItem(LS_PREFIX + id);
  }

  function listAll() {
    return listIds().map(load).filter(Boolean);
  }

  function isBootstrapped() {
    return localStorage.getItem(LS_BOOTSTRAP) === '1';
  }
  function markBootstrapped() {
    localStorage.setItem(LS_BOOTSTRAP, '1');
  }

  // On the very first run, seed the store with the examples baked into the
  // bundle. Returns the number of templates added (0 if already bootstrapped
  // or no builtins are available).
  function bootstrapIfEmpty() {
    if (isBootstrapped()) return 0;
    const builtin = globalThis.WfrBuiltinTemplates;
    let added = 0;
    if (Array.isArray(builtin)) {
      for (const wf of builtin) {
        if (wf && wf.id && !load(wf.id)) {
          if (save(wf)) added++;
        }
      }
    }
    markBootstrapped();
    return added;
  }

  // Re-seed: erase the bootstrap flag and pull in any builtins not already
  // present. Useful to recover the example templates after deleting them.
  function reseed() {
    localStorage.removeItem(LS_BOOTSTRAP);
    return bootstrapIfEmpty();
  }

  function exportAll() {
    return { workflows: listAll() };
  }

  // Accepts either { workflows: [...] }, a bare array, or a single workflow
  // object. Returns counts of added / replaced / skipped entries so the UI
  // can give the user feedback.
  function importPayload(payload) {
    let entries = [];
    if (Array.isArray(payload)) entries = payload;
    else if (payload && Array.isArray(payload.workflows)) entries = payload.workflows;
    else if (payload && payload.id && Array.isArray(payload.steps)) entries = [payload];

    let added = 0, replaced = 0, skipped = 0;
    for (const wf of entries) {
      if (!wf || !wf.id || !Array.isArray(wf.steps)) { skipped++; continue; }
      if (load(wf.id)) replaced++;
      else added++;
      save(wf);
    }
    return { added, replaced, skipped };
  }

  globalThis.WfrTemplates = {
    listAll, load, save, remove,
    bootstrapIfEmpty, reseed, exportAll, importPayload,
  };
})();
