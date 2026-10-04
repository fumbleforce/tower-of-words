// Who the character viewer (viewer.html) can show, made the way the game makes them, in either look:
// 'chibi': the named cast and the eight generic islanders through chibi.js (chibiFiles + chibiFrom: the same builds,
//   faces, textures and clips; an islander wears variant i of its colours from chibi-crowd.js);
// 'code': what the game shows with ?chibi=0: Eric's and Mio's approved models (avatar.js loadEric, mio.js loadMio),
//   everyone else code-built (cast.js PEOPLE), and the office workers (PEOPLE.worker(i)) for the islanders.
// Tama (creatures/cat.js) is the same in both.
//   make(look, key) -> a body (bodies.js). key: 'mio', 'gen-suit.3' (variant 3 of the suit base), 'worker.2', 'tama'.
import { chibiFiles, chibiFrom } from '../chibi.js';
import { GEN, variant } from '../chibi-crowd.js';
import { PEOPLE } from '../cast.js';
import { loadEric } from '../avatar.js';
import { loadMio } from '../mio.js';
import { meshyBody, codeBody, catBody } from './bodies.js';
export { CAT_MOVES } from './bodies.js';

export const LOOKS = ['chibi', 'code'];
export const CAST = [
  ['eric', 'Eric'],
  ['mio', 'Mio'],
  ['kuro', 'Kuro'],
  ['mori', 'Mr. Mori'],
  ['kenji', 'Kenji'],
  ['emi', 'Emi'],
  ['guard', 'Mr. Ishibashi'],
  ['kuroda', 'Mr. Hamada'],
  ['aoi', 'Aoi'],
  ['rei', 'Rei'],
];
// the islanders of each look
export const BASES = {
  chibi: Object.keys(GEN).map((b) => ['gen-' + b, b[0].toUpperCase() + b.slice(1)]),
  code: [['worker', 'Office worker']],
};
export const ANIMALS = [['tama', 'Tama']];
const LABEL = Object.fromEntries([...CAST, ...BASES.chibi, ...BASES.code, ...ANIMALS]);
const WORKERS = 12; // PEOPLE.worker's colours repeat after 4 * 7
// an islander key (one with colours), and how many colour mixes it has (variant() counts through all of them)
export const coloured = (id) => id.startsWith('gen-') || id === 'worker';
export function variants(id) {
  if (id === 'worker') return WORKERS;
  const g = GEN[id.slice(4)];
  return g.top.length * g.hair.length * (g.bottom === 'top' ? 1 : g.bottom.length);
}
export const parseKey = (key) => {
  const [id, v] = key.split('.');
  return { id, v: coloured(id) ? +v || 0 : 0 };
};
// whether a key's person is in this look
export const inLook = (look, id) => id in LABEL && (!coloured(id) || BASES[look].some(([b]) => b === id));

// people: idle, walk, run, sit, phone, then whichever gestures their clips have
export const MOVES = ['idle', 'walk', 'run', 'sit', 'phone', 'bow', 'wave', 'shrug', 'nod'];

const name = (id, v) => LABEL[id] + (coloured(id) ? ' ' + (v + 1) : '');

async function chibi(key, id, v) {
  const f = await chibiFiles(id);
  const gen = id.startsWith('gen-');
  const m = chibiFrom(f, gen ? { tint: variant(id.slice(4), v), height: GEN[id.slice(4)].h } : {});
  return meshyBody(key, name(id, v), m, { height: gen ? GEN[id.slice(4)].h : 1.15, phone: !!f.clips.phone });
}

async function code(key, id, v) {
  if (id === 'eric') return meshyBody(key, name(id, v), await loadEric(), { height: 1.2 });
  if (id === 'mio') return meshyBody(key, name(id, v), await loadMio({ height: 1.12 }), { height: 1.12 });
  const r = id === 'worker' ? PEOPLE.worker(v) : PEOPLE[id]();
  return codeBody(key, name(id, v), r);
}

export async function make(look, key) {
  const { id, v } = parseKey(key);
  if (id === 'tama') return catBody(key);
  return look === 'code' ? code(key, id, v) : chibi(key, id, v);
}
