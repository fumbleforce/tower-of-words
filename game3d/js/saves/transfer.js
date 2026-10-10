// Export and import of one save (docs/game/controls-and-ui.md, Saves): a .amakawa-save file holds a slot's game,
// its line and date, and its picture. An imported file is checked (format, version, shape) before it touches a
// slot; a file from a newer build of the game is refused rather than half read.
//   const text = exportText(info, thumb); await saveFile(exportName(info), text);
//   const got = await openFile(); const check = parseSave(got.text); if (check.ok) store.write(id, check.slot)
// On the desktop the files go through native dialogs (storage.files); in the browser through a download and a file
// picker. The checks have no DOM, so the unit tests run them in Node.
import { storage } from '../storage.js';

export const FORMAT = 'amakawa-save';
export const VERSION = 1;
export const EXT = '.amakawa-save';
const MAX_FILE = 32 * 1024 * 1024;
const MAX_PICTURE = 4 * 1024 * 1024;

export function exportText(info, thumb = null) {
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    exported: new Date().toISOString(),
    slot: { data: info.data, line: info.line || '', date: info.date || '', at: info.at || 0 },
    thumb: thumb || null,
  });
}

export function exportName(info, at = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const when = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
  const where = String(info.place || 'save').replace(/[^\w-]/g, '');
  return `amakawa-day${info.day || 1}-${where}-${when}${EXT}`;
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const fail = (error) => ({ ok: false, error });
const NOT_A_SAVE = "That file isn't an Amakawa save.";
const DAMAGED = 'That save file is damaged, so it was not imported.';

// { ok: true, slot: { data, line, date, thumb }, at } or { ok: false, error } with a sentence for the screen
export function parseSave(text) {
  if (typeof text !== 'string' || !text.length) return fail(NOT_A_SAVE);
  if (text.length > MAX_FILE) return fail(NOT_A_SAVE);
  let f;
  try {
    f = JSON.parse(text);
  } catch {
    return fail(NOT_A_SAVE);
  }
  if (!isObj(f) || f.format !== FORMAT) return fail(NOT_A_SAVE);
  if (!Number.isInteger(f.version) || f.version < 1) return fail(DAMAGED);
  if (f.version > VERSION)
    return fail('That save was made by a newer version of the game. Update the game to load it.');
  const s = f.slot;
  if (!isObj(s) || !isObj(s.data)) return fail(DAMAGED);
  const d = s.data;
  const shape =
    d.v === 1 &&
    typeof d.place === 'string' &&
    d.place.length > 0 &&
    d.place.length < 64 &&
    (d.day === undefined || (Number.isInteger(d.day) && d.day >= 1)) &&
    (d.period === undefined || typeof d.period === 'string') &&
    (d.flags === undefined || isObj(d.flags)) &&
    (d.inv === undefined || Array.isArray(d.inv)) &&
    (d.known === undefined || Array.isArray(d.known)) &&
    (d.yen === undefined || typeof d.yen === 'number');
  if (!shape) return fail(DAMAGED);
  const thumb = f.thumb;
  if (thumb != null && (typeof thumb !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(thumb)))
    return fail(DAMAGED);
  if (thumb && thumb.length > MAX_PICTURE) return fail(DAMAGED);
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return {
    ok: true,
    slot: { data: d, line: str(s.line, 300), date: str(s.date, 40), thumb: thumb || null },
    at: typeof s.at === 'number' ? s.at : 0,
  };
}

// write the file: a native Save dialog on the desktop, a download in the browser
export async function saveFile(name, text, files = storage.files) {
  if (files) return files.save(name, text);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true, path: name };
}

// pick a file: a native Open dialog on the desktop, a file input in the browser. Called from the click itself, so
// the browser lets the picker open.
export function openFile(files = storage.files) {
  if (files) return files.open();
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${EXT},application/json`;
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return res({ ok: false, canceled: true });
      if (f.size > MAX_FILE) return res({ ok: false, error: NOT_A_SAVE });
      res({ ok: true, name: f.name, text: await f.text() });
    };
    input.addEventListener('cancel', () => res({ ok: false, canceled: true }));
    input.click();
  });
}
