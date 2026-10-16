// Who the character viewer (viewer.html) can show, made the way the game makes them: Eric's and Mio's approved models
// (avatar.js loadEric, mioBody), the rest of the cast through cast.js PEOPLE (their Meshy models, cast3d.js), the
// approved crowd bodies for the islanders (crowd/approved-models.js; a tinted body wears variant i of its base's
// colours from crowd/bodies.js), and Tama (creatures/cat.js).
//   make(key) -> a body (bodies.js). key: 'mio', 'casual-1.3' (variant 3 of the casual body), 'tama'.
import { GEN, variant } from '../crowd/bodies.js';
import { approvedCrowd, prepareApprovedCrowd } from '../crowd/approved-models.js';
import { PEOPLE } from '../cast.js';
import { CAST3D } from '../cast3d.js';
import { loadEric, mioBody } from '../avatar.js';
import { meshyBody, catBody } from './bodies.js';
export { CAT_MOVES } from './bodies.js';

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
// the islanders: the approved crowd bodies, and the base whose colours a tinted one wears (crowd/bodies.js crowdBody)
const ISLANDERS = {
  a: ['Office man', null, 1.09],
  b: ['Office woman', null, 1.06],
  'casual-1': ['Casual', 'hoodie', 1.06],
  'older-1': ['Older', 'polo', 1.09],
  'service-1': ['Apron', 'apron', 1.09],
};
export const BASES = Object.entries(ISLANDERS).map(([id, [label]]) => [id, label]);
export const ANIMALS = [['tama', 'Tama']];
const LABEL = Object.fromEntries([...CAST, ...BASES, ...ANIMALS]);
// an islander key with colours, and how many colour mixes it has (variant() counts through all of them)
export const coloured = (id) => !!ISLANDERS[id]?.[1];
export function variants(id) {
  const g = GEN[ISLANDERS[id][1]];
  return g.top.length * g.hair.length * (g.bottom === 'top' ? 1 : g.bottom.length);
}
export const parseKey = (key) => {
  const [id, v] = key.split('.');
  return { id, v: coloured(id) ? +v || 0 : 0 };
};
export const known = (id) => id in LABEL;

// people: idle, walk, run, sit, phone, then whichever gestures their clips have
export const MOVES = ['idle', 'walk', 'run', 'sit', 'phone', 'bow', 'wave', 'shrug', 'nod'];

const name = (id, v) => LABEL[id] + (coloured(id) ? ' ' + (v + 1) : '');
// a game person (cast3d.js meshyPerson) steps itself as it is drawn; here the viewer's body steps it (bodies.js)
function stepped(m) {
  m.model.traverse((o) => o.isSkinnedMesh && (o.onBeforeRender = () => {}));
  return m;
}

async function islander(key, id, v) {
  await prepareApprovedCrowd([id]);
  const [, base, height] = ISLANDERS[id];
  const m = approvedCrowd(id, base ? { tint: variant(base, v) } : {});
  if (!m) throw new Error(`crowd body ${id} did not load`);
  return meshyBody(key, name(id, v), stepped(m), { height, phone: false });
}

export async function make(key) {
  const { id, v } = parseKey(key);
  if (id === 'tama') return catBody(key);
  if (ISLANDERS[id]) return islander(key, id, v);
  if (id === 'eric') return meshyBody(key, name(id, v), await loadEric(), { height: 1.2 });
  if (id === 'mio') return meshyBody(key, name(id, v), await mioBody(), { height: 1.12 });
  const r = PEOPLE[id]();
  if (!r.meshy) throw new Error(`${id}: no Meshy model loaded`);
  return meshyBody(key, name(id, v), stepped(r), { height: CAST3D[id] || 1.12 });
}
