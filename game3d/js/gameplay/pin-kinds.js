// What a pin is and what its tooltip says (docs/game/controls-and-ui.md, The HUD, Markers). Jørgen, 2026-10-05:
// "when I hover an interactive eye / heart element it should have a description, and navigation points that take
// you between areas should not have an eye icon, something else".
//
// Pins that take Eric between places (doors, stairs, the lift, ways out, walk-to points) are told apart here, in
// one table, never by checks spread over the places: a thing whose verb says it goes somewhere (Go, Go in, Go out,
// Go to, Walk to) is a way out by that verb, and TRAVEL_PINS names the rest and the ones whose kind differs from their verb.
// Pure data and functions, no imports: interactions.js, goal-at.js, engine.js and act-menu.js use them, and
// test/unit/pin-kinds.test.mjs checks them.

// each kind of way out: its symbol (engine.js PIN_GLYPHS) and its verb when the thing doesn't name one
export const TRAVEL_KINDS = {
  exit: { glyph: 'arrow', verb: 'Go' },
  door: { glyph: 'door', verb: 'Go in' },
  stairs: { glyph: 'stairs', verb: 'Take the stairs' },
  lift: { glyph: 'lift', verb: 'Take the lift' },
  walk: { glyph: 'walk', verb: 'Walk to' },
};

// a verb that alone makes a thing a way out, and the kind it makes
export const TRAVEL_VERBS = { Go: 'exit', 'Go in': 'door', 'Go out': 'door', 'Go to': 'walk', 'Walk to': 'walk' };

// The ways out whose verb doesn't say so (or says a different kind), by place and thing id. `tip` is the whole
// tooltip where the label alone can't name the destination; `verb` replaces the menu's verb.
export const TRAVEL_PINS = {
  train: {
    doors: { kind: 'door', verb: 'Get off', tip: 'Get off the train' },
    door_l: { kind: 'door', verb: 'Get off', tip: 'Get off the train' },
    door_r: { kind: 'door', verb: 'Get off', tip: 'Get off the train' },
  },
  gate: {
    lift: { kind: 'exit', tip: 'Go out to the forecourt' }, // the old lift id: now the open exit (places.md)
    forecourt_way: { kind: 'exit', tip: 'Go out to the forecourt' },
  },
  forecourt: {
    station_exit: { kind: 'door', tip: 'Go into the station' },
    office_entrance: { kind: 'door', tip: 'Go into head office' },
    lift: { kind: 'lift', tip: 'Take the lift down to B2' },
  },
  office: {
    lift: { kind: 'lift', tip: 'Take the lift up to the lobby' },
  },
  plaza: {
    dorm_lane: { kind: 'exit' },
  },
  dorm_court: {
    dorm_entry: { kind: 'door', tip: 'Go into the dorm' },
    stairs: { kind: 'stairs', tip: 'Take the stairs up to your room' },
  },
  dorms: {
    door_203: { kind: 'door', tip: 'Go into room 203' },
    door_out: { kind: 'door', tip: 'Go out of your room' },
    stairs_up: { kind: 'stairs', tip: 'Take the stairs up' },
    stairs_down: { kind: 'stairs', tip: 'Take the stairs down' },
  },
  karaoke: {
    karaoke_door: { kind: 'door', verb: 'Go out' },
    karaoke_stairs: { kind: 'stairs', tip: 'Take the stairs up' },
  },
  karaoke_booth: {
    booth_door: { kind: 'stairs', tip: 'Take the stairs down' },
  },
};

// The way out a thing is, or null: { kind, glyph, verb, tip }. `place` is the place's name (place.name), `t` the
// thing as the catalog and the place gave it (its verb, and a tip of its own if it has one).
export function travelOf(place, id, t = {}) {
  const e = (place && TRAVEL_PINS[place]?.[id]) || null;
  const kind = e?.kind || TRAVEL_VERBS[t.verb];
  if (!kind) return null;
  // the thing's own verb stays when it is already one of this kind's verbs (Go in, Go out on a door)
  const verb = e?.verb || (TRAVEL_VERBS[t.verb] === kind ? t.verb : TRAVEL_KINDS[kind].verb);
  return { kind, glyph: TRAVEL_KINDS[kind].glyph, verb, tip: e?.tip || t.tip || null };
}

const isPerson = (item) => /person/.test(item.kind || '');
// the symbol name a pin was given (a local plugin's heart), or ''
export const iconName = (item) => (typeof item.icon === 'function' ? item.icon() : item.icon) || '';
// a pin a local plugin made private: its heart, or `private: true`
export const isPrivatePin = (item) => !!item.private || /^heart/.test(iconName(item));

// The symbol on the pin: a way out's own (door, arrow, stairs, lift, walk), a paw to pet, speech for people, the eye
// for everything else. A private plugin's heart goes over it in engine.js, in private mode only.
export function pinGlyph(item) {
  if (item.travel) return item.travel.glyph;
  if (item.verb === 'Pet') return 'paw';
  return isPerson(item) ? 'talk' : 'look';
}

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// What the pin's tooltip and the action menu say: { verb, name, text }. text is the tooltip: "Look: Vending machine",
// "Talk: Mr. Mori", "Go to the plaza", "Take the lift down to B2". With private mode off a private pin says only
// the neutral verb (and a person's name, which is public), never a private label or tip, so no private wording shows
// in public play. `flags` are the story flags, for a thing's verbIf.
export function pinTip(item, { privateMode = false, flags = {} } = {}) {
  const person = isPerson(item);
  if (isPrivatePin(item) && !privateMode) {
    const verb = person ? 'Talk' : 'Look';
    const name = person ? item.label || '' : '';
    return { verb, name, text: name ? `${verb}: ${name}` : verb };
  }
  const tr = item.travel;
  // a verb that changes with the story: Tama says Return the chair while clicking her does that, Pet otherwise
  const vi = item.verbIf;
  const live = vi && flags[vi.set] && !flags[vi.unset] ? vi.verb : '';
  const verb = (tr && tr.verb) || live || item.verb || (person ? 'Talk' : 'Look');
  const name = item.label || '';
  if (tr && tr.tip) return { verb, name, text: tr.tip };
  // a way out labelled with its destination ("To the plaza") reads as one phrase: "Go to the plaza"
  if (tr && /^to /i.test(name)) return { verb, name, text: `${verb} ${lowerFirst(name)}` };
  return { verb, name, text: name ? `${verb}: ${name}` : verb };
}
