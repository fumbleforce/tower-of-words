// The save slots (docs/game/systems.md, Saving): the autosave, one quick slot and twelve manual slots. Each slot is
// a copy of the autosave's data (sim.js save) with what the saves screen shows: the day, period, place, the goal or
// the line on screen, and when it was saved. Records live in localStorage under their old keys (amakawa-slot-1..3
// from the three-slot build keep working); thumbnails go to IndexedDB, so a dozen pictures don't eat the few MB
// localStorage has. Where IndexedDB isn't there (Node tests, a locked-down browser) a thumbnail stays in its record,
// as the old build kept it.
//   const store = createSlotStore({ kv: localKV(), thumbs: idbThumbs() }); await store.migrate();
// No DOM and no game imports, so the unit tests run it in Node with Map-backed fakes.
export const KEYS = {
  SAVE: 'amakawa-day1-save',
  AUTO_META: 'amakawa-auto-meta',
  CONTINUE: 'amakawa-continue',
  VERSION: 'amakawa-saves-v',
};
export const SLOT_COUNT = 12;
export const MANUAL = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1);
// the order the saves screen lists them in
export const ALL_IDS = ['quick', 'auto', ...MANUAL];
export const slotKey = (id) => (id === 'auto' ? KEYS.AUTO_META : `amakawa-slot-${id}`);
export const slotLabel = (id) => (id === 'quick' ? 'Quick save' : id === 'auto' ? 'Autosave' : `Slot ${id}`);

export function createSlotStore({ kv, thumbs = null, now = () => Date.now() }) {
  // a record as the screen needs it; the data itself stays in the record
  function info(id) {
    if (id === 'auto') {
      const d = kv.get(KEYS.SAVE);
      if (!d || !d.place) return null;
      const m = kv.get(KEYS.AUTO_META) || {};
      return describe('auto', d, m);
    }
    const s = kv.get(slotKey(id));
    return s && s.data ? describe(id, s.data, s) : null;
  }
  function describe(id, data, meta) {
    return {
      id,
      kind: id === 'auto' ? 'auto' : id === 'quick' ? 'quick' : 'slot',
      i: typeof id === 'number' ? id : 0,
      label: slotLabel(id),
      data,
      day: data.day || 1,
      place: data.place,
      period: data.period,
      date: meta.date || '',
      line: meta.line ?? data.ui?.goal ?? '',
      at: meta.at || 0,
      inlineThumb: meta.thumb || null,
    };
  }
  async function putThumb(key, thumb) {
    if (!thumb) {
      await thumbs?.del(key).catch(() => {});
      return true;
    }
    if (!thumbs) return false;
    return thumbs.set(key, thumb).then(
      () => true,
      () => false,
    );
  }
  return {
    info,
    list: () => ALL_IDS.map((id) => ({ id, label: slotLabel(id), info: info(id) })),
    // the newest of all saves (the title's Continue card)
    latest: () =>
      ALL_IDS.map(info)
        .filter(Boolean)
        .sort((a, b) => b.at - a.at)[0] || null,
    any: () => ALL_IDS.some((id) => info(id)),
    async thumb(id) {
      const key = slotKey(id);
      const rec = kv.get(key);
      if (rec?.thumb) return rec.thumb;
      // no record (an autosave note cleared by the title's Day 2): a picture left in IndexedDB is stale
      if (!rec || !thumbs) return null;
      return thumbs.get(key).catch(() => null);
    },
    // save into a quick or manual slot; false when storage refused it (full, or off)
    async write(id, { data, thumb = null, line = '', date = '' }) {
      if (id === 'auto' || !data) return false;
      const key = slotKey(id);
      const rec = {
        v: 2,
        data,
        place: data.place,
        period: data.period,
        day: data.day || 1,
        date,
        line,
        at: now(),
      };
      const stored = await putThumb(key, thumb);
      if (!stored && thumb) rec.thumb = thumb;
      return kv.set(key, rec);
    },
    // the autosave's note: when it last changed, and its picture
    async noteAuto({ thumb = null, date = '', line = '' }) {
      const rec = { at: now(), date, line };
      const stored = await putThumb(KEYS.AUTO_META, thumb);
      if (!stored && thumb) rec.thumb = thumb;
      return kv.set(KEYS.AUTO_META, rec);
    },
    // loading a slot: its data becomes the autosave (Continue plays the autosave), with its note and picture
    async adopt(id) {
      const s = info(id);
      if (!s) return false;
      if (id === 'auto') return true;
      const thumb = await this.thumb(id);
      if (!kv.set(KEYS.SAVE, s.data)) return false;
      const rec = { at: s.at, date: s.date, line: s.line };
      if (!(await putThumb(KEYS.AUTO_META, thumb)) && thumb) rec.thumb = thumb;
      return kv.set(KEYS.AUTO_META, rec);
    },
    // is the progress in this game state (the autosave's data) already kept in a quick or manual slot? Only what
    // counts as progress is compared (progressKey): where people stand or a scene's staging don't count.
    kept(data) {
      if (!data) return true;
      const p = progressKey(data);
      return ['quick', ...MANUAL].some((id) => {
        const s = kv.get(slotKey(id));
        return s?.data && progressKey(s.data) === p;
      });
    },
    // old builds kept each thumbnail in its slot's record: move them to IndexedDB, and drop the copy in the record
    // only once IndexedDB has it. Nothing else in a record changes, so no save is lost.
    async migrate() {
      if (!thumbs) return 0;
      let moved = 0;
      for (const id of ALL_IDS) {
        const key = slotKey(id);
        const rec = kv.get(key);
        if (!rec?.thumb) continue;
        if (!(await putThumb(key, rec.thumb))) continue;
        const rest = { ...rec };
        delete rest.thumb;
        if (kv.set(key, rest)) moved++;
      }
      kv.set(KEYS.VERSION, 2);
      return moved;
    },
  };
}

// what a load would lose when it differs: the story's flags, words, people, money, Bag, the clock, the place and the
// goal (not positions, staging or a running scene's journal, which a Continue rewrites before the player acts)
export function progressKey(d) {
  return JSON.stringify([
    d.day,
    d.period,
    d.place,
    d.yen,
    d.inv,
    d.met,
    d.known,
    d.taught,
    d.flags,
    d.found,
    d.rel?.bonds?.p,
    d.ended || false,
    d.ui?.goal || '',
  ]);
}

// ---------- browser backends ----------
// (the storage is looked up on each call, so a test can swap localStorage after import)
export function localKV(storage = null) {
  const st = () => storage || globalThis.localStorage;
  return {
    get(k) {
      try {
        return JSON.parse(st().getItem(k) || 'null');
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        st().setItem(k, JSON.stringify(v));
        return true;
      } catch {
        return false;
      }
    },
  };
}

// thumbnails as data URLs in one IndexedDB store; null where IndexedDB is missing
export function idbThumbs(idb = globalThis.indexedDB) {
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
