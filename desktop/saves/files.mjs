// The desktop build's save files (docs/game/systems.md, Saving), main-process side. The game keeps small values
// under string keys (game3d/js/storage.js); here they live in real files under one folder:
//   saves/auto.json      the autosave and its note (keys amakawa-day1-save, amakawa-auto-meta), picture auto.jpg
//   saves/quick.json     the quick slot (amakawa-slot-quick), picture quick.jpg
//   saves/slot-01.json   manual slots 1 to 12 (amakawa-slot-1 ...), pictures slot-01.jpg ...
//   settings.json        the settings (amakawa-settings)
//   progress.json        every other key the game writes (onboarding, read lines, the opening seen, flags), as given
// Each file is { "schema": 1, "keys": { <key>: <value> } } (plus "text" for a value that isn't JSON), so keys this
// build doesn't know are kept as they are. A file from an older schema is upgraded on load (MIGRATIONS); a file
// from a newer one is read as far as it can be and a copy is kept beside it before it is written over.
// Writes are atomic: a temp file is written and fsynced, the current file becomes <name>.bak, and the temp file is
// renamed into place. Reading falls back to the .bak when the file is missing or damaged, with a warning; a damaged
// file is moved aside (<name>.damaged-<time>), never silently written over.
// Writes go out in the background, one at a time per file and coalesced to the newest value; flush() waits for all
// of them (the shell's before-quit), flushSync() writes what is left synchronously (only at process exit).
//   const files = createFileStore(dir, { log: console }); files.snapshot(); files.set(key, text); await files.flush();
// No Electron imports, so the unit tests run it in Node against a temp folder.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export const SCHEMA = 1;
const SAVE = 'amakawa-day1-save';
const AUTO_META = 'amakawa-auto-meta';
const SETTINGS = 'amakawa-settings';
const SLOT = /^amakawa-slot-(quick|\d{1,3})$/;
const PICTURE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const PICTURE_EXTS = [...Object.values(PICTURE_TYPES), 'txt'];

// which file a key lives in (relative to the folder)
export function fileFor(key) {
  if (key === SAVE || key === AUTO_META) return 'saves/auto.json';
  const m = SLOT.exec(key);
  if (m) return m[1] === 'quick' ? 'saves/quick.json' : `saves/slot-${m[1].padStart(2, '0')}.json`;
  if (key === SETTINGS) return 'settings.json';
  return 'progress.json';
}
// a picture's file without its extension: beside its slot's file, else under blobs/
function pictureBase(key) {
  const f = fileFor(key);
  if (f.startsWith('saves/')) return f.replace(/\.json$/, '');
  return 'blobs/' + key.replace(/[^\w.-]/g, (c) => '_' + c.charCodeAt(0).toString(16));
}
// the key a schema-0 file (a bare value, no envelope) holds
function bareKey(rel, value) {
  if (rel === 'settings.json') return SETTINGS;
  if (rel === 'saves/auto.json') return value?.place ? SAVE : AUTO_META;
  const m = /^saves\/(quick|slot-(\d+))\.json$/.exec(rel);
  if (m) return m[1] === 'quick' ? 'amakawa-slot-quick' : `amakawa-slot-${Number(m[2])}`;
  return null; // progress.json: a bare object is its key map
}

// schema n -> n + 1
export const MIGRATIONS = {
  // 0: a file that is just the value (a slot record, the settings), or for progress.json a plain key map
  0: (raw, rel) => {
    const key = bareKey(rel, raw);
    return { schema: 1, keys: key ? { [key]: raw } : { ...raw } };
  },
};

export function upgrade(raw, rel) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  let doc = Number.isInteger(raw.schema) ? raw : MIGRATIONS[0](raw, rel);
  while (doc.schema < SCHEMA) {
    const step = MIGRATIONS[doc.schema];
    if (!step) throw new Error(`no migration from schema ${doc.schema}`);
    doc = step(doc, rel);
  }
  if (!doc.keys || typeof doc.keys !== 'object' || Array.isArray(doc.keys)) throw new Error('no keys');
  if (doc.text != null && (typeof doc.text !== 'object' || Array.isArray(doc.text))) throw new Error('bad text');
  return doc;
}

const RETRY = new Set(['EPERM', 'EBUSY', 'EACCES']); // Windows: a scanner or indexer holding the file for a moment
async function renameRetry(a, b) {
  for (let i = 0; ; i++) {
    try {
      return await fsp.rename(a, b);
    } catch (e) {
      if (!RETRY.has(e.code) || i >= 5) throw e;
      await new Promise((r) => setTimeout(r, 30 * (i + 1)));
    }
  }
}
function syncDir(dir) {
  try {
    const fd = fs.openSync(dir, 'r');
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* Windows can't open a folder; its rename is already durable enough */
  }
}

let seq = 0;
const tempName = (file) => `${file}.tmp-${process.pid}-${++seq}`;

// write a file atomically; with bak the old file is kept as <file>.bak
export async function writeAtomic(file, data, { bak = false } = {}) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = tempName(file);
  const fh = await fsp.open(tmp, 'w');
  try {
    await fh.writeFile(data);
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    if (bak) await renameRetry(file, file + '.bak').catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e)));
    await renameRetry(tmp, file);
  } catch (e) {
    await fsp.rm(tmp, { force: true });
    throw e;
  }
  syncDir(path.dirname(file));
}
export function writeAtomicSync(file, data, { bak = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = tempName(file);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (bak) {
    try {
      fs.renameSync(file, file + '.bak');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  fs.renameSync(tmp, file);
  syncDir(path.dirname(file));
}

export function createFileStore(dir, { log = console } = {}) {
  const docs = new Map(); // rel -> { doc, dirty, writing }
  const pictures = new Map(); // picture base -> the promise of its last change, so changes land in order
  let closed = false;
  const abs = (rel) => path.join(dir, rel);
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

  function readDoc(rel) {
    const file = abs(rel);
    for (const cand of [file, file + '.bak']) {
      let raw;
      try {
        raw = fs.readFileSync(cand, 'utf8');
      } catch (e) {
        if (e.code !== 'ENOENT') log.warn(`saves: can't read ${cand}: ${e.message}`);
        continue;
      }
      try {
        const doc = upgrade(JSON.parse(raw), rel);
        if (doc.schema > SCHEMA) {
          const copy = `${file}.schema${doc.schema}`;
          if (!fs.existsSync(copy)) fs.copyFileSync(cand, copy);
          log.warn(`saves: ${rel} is from a newer build (schema ${doc.schema}); a copy is kept as ${copy}`);
        }
        if (cand !== file) log.warn(`saves: ${rel} was missing or damaged; using its backup ${cand}`);
        return doc;
      } catch (e) {
        log.warn(`saves: ${cand} is damaged (${e.message})`);
        if (cand === file) {
          const aside = `${file}.damaged-${stamp()}`;
          try {
            fs.renameSync(file, aside);
            log.warn(`saves: kept the damaged file as ${aside}`);
          } catch (err) {
            log.warn(`saves: couldn't move ${file} aside: ${err.message}`);
          }
        }
      }
    }
    return null;
  }

  // every file there is, read once
  function load() {
    const rels = new Set(['settings.json', 'progress.json']);
    let names = [];
    try {
      names = fs.readdirSync(abs('saves'));
    } catch {
      /* no saves yet */
    }
    for (const n of names) {
      const m = /^(auto|quick|slot-\d+)\.json(\.bak)?$/.exec(n);
      if (m) rels.add(`saves/${m[1]}.json`);
    }
    for (const rel of rels) {
      const doc = readDoc(rel);
      if (doc) docs.set(rel, { doc, dirty: false, writing: null });
    }
  }

  function entry(rel) {
    if (!docs.has(rel)) docs.set(rel, { doc: { schema: SCHEMA, keys: {} }, dirty: false, writing: null });
    return docs.get(rel);
  }
  const serialize = (rel, doc) => {
    const out = { ...doc, schema: Math.max(SCHEMA, doc.schema || 0), keys: doc.keys };
    if (out.text && !Object.keys(out.text).length) delete out.text;
    return rel.startsWith('saves/') ? JSON.stringify(out) : JSON.stringify(out, null, 2) + '\n';
  };
  function schedule(rel) {
    const e = entry(rel);
    e.dirty = true;
    if (closed || e.writing) return;
    e.writing = (async () => {
      try {
        while (e.dirty && !closed) {
          e.dirty = false;
          await writeAtomic(abs(rel), serialize(rel, e.doc), { bak: true });
        }
      } catch (err) {
        log.error(`saves: couldn't write ${rel}: ${err.message}`);
        e.dirty = true; // kept in memory; the next change or flush tries again
      } finally {
        e.writing = null;
      }
    })();
  }

  load();
  return {
    dir,
    // { key: string } for the renderer's one synchronous read at startup
    snapshot() {
      const out = {};
      for (const { doc } of docs.values()) {
        for (const [k, v] of Object.entries(doc.keys)) out[k] = JSON.stringify(v);
        for (const [k, v] of Object.entries(doc.text || {})) out[k] = String(v);
      }
      return out;
    },
    set(key, text) {
      if (typeof key !== 'string' || typeof text !== 'string') return false;
      const rel = fileFor(key);
      const { doc } = entry(rel);
      try {
        doc.keys[key] = JSON.parse(text);
        if (doc.text) delete doc.text[key];
      } catch {
        delete doc.keys[key];
        (doc.text ||= {})[key] = text;
      }
      schedule(rel);
      return true;
    },
    remove(key) {
      if (typeof key !== 'string') return false;
      const rel = fileFor(key);
      if (!docs.has(rel)) return true;
      const { doc } = docs.get(rel);
      delete doc.keys[key];
      if (doc.text) delete doc.text[key];
      schedule(rel);
      return true;
    },
    async blobGet(key) {
      const base = abs(pictureBase(key));
      await pictures.get(base);
      for (const ext of PICTURE_EXTS) {
        let buf;
        try {
          buf = await fsp.readFile(`${base}.${ext}`);
        } catch {
          continue;
        }
        if (ext === 'txt') return buf.toString('utf8');
        const mime = Object.keys(PICTURE_TYPES).find((t) => PICTURE_TYPES[t] === ext);
        return `data:${mime};base64,${buf.toString('base64')}`;
      }
      return null;
    },
    blobPut(key, value) {
      const base = abs(pictureBase(key));
      const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(String(value));
      const ext = (m && PICTURE_TYPES[m[1]]) || 'txt';
      const data = ext === 'txt' ? String(value) : Buffer.from(m[2], 'base64');
      return chain(base, async () => {
        await writeAtomic(`${base}.${ext}`, data);
        await Promise.all(PICTURE_EXTS.filter((x) => x !== ext).map((x) => fsp.rm(`${base}.${x}`, { force: true })));
      });
    },
    blobDel(key) {
      const base = abs(pictureBase(key));
      return chain(base, () => Promise.all(PICTURE_EXTS.map((x) => fsp.rm(`${base}.${x}`, { force: true }))));
    },
    pending: () => [...docs.values()].some((e) => e.dirty || e.writing) || pictures.size > 0,
    // wait until every change so far is on disk (a failed write is retried once here)
    async flush() {
      for (let round = 0; round < 3; round++) {
        for (const [rel, e] of docs) if (e.dirty && !e.writing) schedule(rel);
        const busy = [...[...docs.values()].map((e) => e.writing), ...pictures.values()].filter(Boolean);
        if (!busy.length) return;
        await Promise.allSettled(busy);
      }
    },
    // at process exit: write whatever isn't on disk yet, synchronously; nothing is written after this
    flushSync() {
      closed = true;
      for (const [rel, e] of docs) {
        if (!e.dirty && !e.writing) continue;
        try {
          writeAtomicSync(abs(rel), serialize(rel, e.doc), { bak: true });
          e.dirty = false;
        } catch (err) {
          log.error(`saves: couldn't write ${rel} at exit: ${err.message}`);
        }
      }
    },
  };

  function chain(base, fn) {
    const run = (pictures.get(base) || Promise.resolve()).catch(() => {}).then(fn);
    const tail = run.catch(() => {});
    pictures.set(base, tail);
    tail.then(() => pictures.get(base) === tail && pictures.delete(base));
    return run;
  }
}
