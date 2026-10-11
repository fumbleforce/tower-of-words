// The story map: every scene, public and private, sorted into the day and place it plays in, with its ways in and
// the parts its choices and jumps lead to. Public scenes come from /api/subplots/map (storymap.mjs), private ones from
// their placement in the catalog. The scene list (outline.js) and the map board (board.js) draw this.
import { S } from './store.js';
import { humanize, personName, placeName } from './names.js';
import { readRestrictions, summary } from './restrictions.js';

export const DAYS = [
  { id: 1, label: '1', title: 'Day 1' }, { id: 2, label: '2', title: 'Day 2' }, { id: 3, label: '3', title: 'Day 3' },
  { id: 4, label: '4', title: 'Day 4' }, { id: 5, label: '5', title: 'Day 5' },
  { id: 'later', label: '6+', title: 'Day 6 on' }, { id: 'any', label: 'Any', title: 'Any day' },
];
export const dayTitle = id => DAYS.find(d => d.id === id)?.title || 'Any day';

// the bible's names, for restriction sentences (restrictions.js)
export const names = {
  person: id => S.authoring.characters.find(c => c.id === id)?.name,
  word: id => S.authoring.words.find(w => w.id === id),
  variable: id => S.authoring.variables.find(v => v.id === id),
  scene: id => humanize(id),
  humanize,
};

// A way in, in words: "Talk to Mio", "When you arrive".
export function wayLabel(entry, place) {
  if (!entry) return '';
  if (entry.event === 'start') return place ? `Arriving at ${placeName(place)}` : 'When the place starts';
  const known = S.authoring.events.find(e => e.id === entry.event)?.label;
  if (known) return known;
  const [action, target] = entry.event.split(':');
  if (action === 'ask') return `Ask ${personName(target)} about something`;
  return humanize(entry.event.replaceAll(':', ' '));
}

// Area for a scene that isn't tied to one place: conversations, investigations, shared helpers.
function areaTitle(area) {
  const [kind, base] = String(area).split('/');
  if (kind === 'conversations' && base) return `Talks with ${personName(base)}`;
  if (kind === 'investigations' && base) return `Investigation · ${humanize(base)}`;
  return humanize(area);
}

const privateDay = (placement, scene) => {
  const day = placement?.day ?? Number(/^d(\d+)-/.exec(scene || '')?.[1]) ?? null;
  if (!day) return 'any';
  return day > 5 ? 'later' : day;
};

// Every scene as an item of the map: {row, day, place, area, areaTitle, entries, routes, model, way, note, parts}.
// Items are the scenes something starts; `parts` holds the rows only their choices or jumps reach.
export function buildMap(catalog = S.catalog, map = S.map) {
  const byId = new Map((map?.scenes || []).map(s => [s.id, s]));
  const items = [];
  const public_ = catalog.filter(r => r.audience !== 'private' && byId.has(r.id));
  const reached = new Set();
  for (const r of public_) {
    const s = byId.get(r.id);
    for (const route of s.routes) if (['choice', 'jump', 'call'].includes(route.kind)) reached.add(`public:${s.file}#${route.to}`);
  }
  for (const r of public_) {
    const s = byId.get(r.id);
    if (!s.entries.length) continue;
    const first = s.entries[0];
    const model = readRestrictions(first.condition, { once: first.once });
    items.push({
      row: r, kind: 'public', day: s.day, place: s.place, area: s.place || s.area, areaTitle: s.place ? placeName(s.place) : areaTitle(s.area),
      entries: s.entries, routes: s.routes, model,
      way: wayLabel(first, s.place) + (s.entries.length > 1 ? ` +${s.entries.length - 1}` : ''),
      note: summary(model, names), parts: partsOf(s, byId, catalog),
    });
  }
  // the place's own arrival first, chats that run when nothing else is on last, the rest in the file's order
  const rank = it => (it.entries[0]?.event === 'start' ? 0 : /^idle:/.test(it.entries[0]?.event) ? 2 : 1);
  items.sort((a, b) => rank(a) - rank(b));
  // parts nothing in their file leads to (reached from code or another file): listed last in their place
  for (const r of public_) {
    const s = byId.get(r.id);
    if (s.entries.length || reached.has(r.id)) continue;
    items.push({ row: r, kind: 'loose', day: s.day, place: s.place, area: s.place || s.area, areaTitle: s.place ? placeName(s.place) : areaTitle(s.area), entries: [], routes: s.routes, model: readRestrictions(''), way: '', note: '', parts: [] });
  }
  // scenes the map couldn't read (it failed, or the file is new since): listed under any day by their file
  for (const r of catalog.filter(x => x.audience !== 'private' && !byId.has(x.id))) {
    const area = r.group || 'other';
    items.push({ row: r, kind: 'other', day: 'any', place: null, area, areaTitle: areaTitle(area), entries: [], routes: [], model: readRestrictions(''), way: '', note: '', parts: [] });
  }
  // private scenes: one item per scene, its other nodes are its parts
  const groups = new Map();
  for (const r of catalog.filter(x => x.audience === 'private')) {
    const key = r.scene || r.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const [scene, rows] of groups) {
    const main = rows.find(r => r.node === 'start' || r.node === 'steps') || rows[0];
    const placement = main.placement || {};
    const model = readRestrictions(placement.condition || '', { seen: `${scene}_seen` });
    items.push({
      row: main, kind: 'private', day: privateDay(placement, scene), place: placement.place || null,
      area: placement.place || 'private', areaTitle: placement.place ? placeName(placement.place) : 'Private scenes with no place yet',
      entries: [], routes: [], model, way: placement.place ? `Shows up at ${placeName(placement.place)}` : '',
      note: summary(model, names, { day: false }), parts: rows.filter(r => r !== main),
    });
  }
  return items;
}

// The rows a scene's choices, jumps and calls lead to inside its own file, and theirs, once each.
function partsOf(scene, byId, catalog) {
  const out = [], seen = new Set([scene.id]);
  const visit = s => {
    for (const route of s.routes) {
      if (!['choice', 'jump', 'call'].includes(route.kind)) continue;
      const id = `public:${s.file}#${route.to}`;
      const next = byId.get(id);
      if (seen.has(id) || !next || next.entries.length) continue;
      seen.add(id);
      const row = catalog.find(r => r.id === id);
      if (row) out.push(row);
      visit(next);
    }
  };
  visit(scene);
  return out;
}

// The day's places in play order (places/definitions.js), then the areas that aren't places.
export function areasOf(items, day) {
  const order = (S.map?.places || []).map(p => p.id);
  const areas = new Map();
  for (const it of items.filter(i => i.day === day)) {
    if (!areas.has(it.area)) areas.set(it.area, { id: it.area, title: it.areaTitle, place: it.place, items: [] });
    areas.get(it.area).items.push(it);
  }
  const rank = a => { const i = order.indexOf(a.place); return i < 0 ? order.length + (a.id === 'private' ? 1 : 0) : i; };
  return [...areas.values()].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

// The map's row for a public scene: its day, place, file, ways in and routes out.
export const mapScene = id => S.map?.scenes?.find(s => s.id === id) || null;

// Which day and area a scene id sits in (the open scene's place in the list).
export function locate(items, id) {
  return items.find(i => i.row.id === id || i.parts.some(p => p.id === id)) || null;
}
