// Everything the game keeps between visits goes through here (docs/game/systems.md, Saving): the autosave and the
// slots, settings, onboarding, read lines and the other small flags. Callers use one interface and never learn where
// it is kept:
//   storage.get(key) / storage.set(key, value)     small JSON values, synchronous (null when missing or unreadable)
//   storage.getText(key) / storage.setText(key, s) the same, as the stored string ('1' flags, change checks)
//   storage.remove(key); storage.works()          false where the browser blocks storage altogether
//   storage.blobs.get/set/del(key)                 pictures (data URLs), async; null where there is nowhere to put them
//   storage.files                                  native save and open dialogs on the desktop, else null
// set, setText and remove return false when the value wasn't kept (storage full or off); nothing here throws.
// Two backends:
//   browser: localStorage (looked up on each call, so a test can swap it after import) and IndexedDB for pictures
//            (database amakawa-saves), with the keys the game always used, so existing saves keep working;
//   desktop: window.desktop.storage from the desktop shell's preload (desktop/saves/preload-api.cjs). Its snapshot of
//            every value is read once at startup; writes update that copy at once and go to the files on disk in the
//            background (desktop/saves/files.mjs).
// No DOM and no game imports, so tools and the unit tests import it in Node.

export function createStorage(backend) {
  let keep = null; // readOnly(): the only keys still written
  const held = (k) => keep && !keep.has(k);
  const tryRead = (fn) => {
    try {
      return fn();
    } catch {
      return null;
    }
  };
  const tryWrite = (k, fn) => {
    if (held(k)) return true;
    try {
      fn();
      return true;
    } catch {
      return false;
    }
  };
  return {
    kind: backend.kind,
    getText: (k) => tryRead(() => backend.getItem(k) ?? null),
    setText: (k, s) => tryWrite(k, () => backend.setItem(k, String(s))),
    get: (k) => tryRead(() => JSON.parse(backend.getItem(k) ?? 'null')),
    set: (k, v) => tryWrite(k, () => backend.setItem(k, JSON.stringify(v))),
    remove: (k) => tryWrite(k, () => backend.removeItem(k)),
    // false where the browser blocks storage altogether (a value read as null may then still exist)
    works: () => tryRead(() => backend.works?.() ?? true) === true,
    blobs: backend.blobs || null,
    files: backend.files || null,
    // a run that must leave everything as it was (a preview): until the page reloads, writes to any key not in
    // `except` are dropped, and reads still see what was there
    readOnly(except = []) {
      keep = new Set(except);
    },
  };
}

export function browserBackend(ls = () => globalThis.localStorage, idb = () => globalThis.indexedDB) {
  return {
    kind: 'browser',
    getItem: (k) => ls().getItem(k),
    setItem: (k, s) => ls().setItem(k, s),
    removeItem: (k) => ls().removeItem(k),
    works: () => !!ls(),
    blobs: idbBlobs(idb),
  };
}

// api: { snapshot: { key: string }, set(k, s), remove(k), blobGet(k), blobPut(k, v), blobDel(k), saveFile(name,
// text), openFile() } (desktop/saves/preload-api.cjs)
export function desktopBackend(api) {
  const cache = new Map(Object.entries(api.snapshot || {}));
  return {
    kind: 'desktop',
    getItem: (k) => (cache.has(k) ? cache.get(k) : null),
    setItem(k, s) {
      cache.set(k, s);
      api.set(k, s);
    },
    removeItem(k) {
      cache.delete(k);
      api.remove(k);
    },
    blobs: {
      get: async (k) => (await api.blobGet(k)) || null,
      set: (k, v) => api.blobPut(k, v),
      del: (k) => api.blobDel(k),
    },
    files: {
      save: (name, text) => api.saveFile(name, text),
      open: () => api.openFile(),
    },
  };
}

// pictures as data URLs in one IndexedDB store; null where IndexedDB is missing
export function idbBlobs(idbOf = () => globalThis.indexedDB) {
  const idb = idbOf();
  if (!idb) return null;
  let db = null;
  const open = () =>
    (db ||= new Promise((res, rej) => {
      const r = idb.open('amakawa-saves', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('thumbs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const tx = (mode, fn) =>
    open().then(
      (d) =>
        new Promise((res, rej) => {
          const t = d.transaction('thumbs', mode);
          const req = fn(t.objectStore('thumbs'));
          t.oncomplete = () => res(req.result);
          t.onerror = t.onabort = () => rej(t.error);
        }),
    );
  return {
    get: (k) => tx('readonly', (s) => s.get(k)).then((v) => v || null),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k)),
  };
}

const desktopApi = globalThis.desktop?.storage;
export const storage = createStorage(desktopApi?.snapshot ? desktopBackend(desktopApi) : browserBackend());
