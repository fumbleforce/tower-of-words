// Event IDs are consumed at their emission sites. `hook` explains graph causality;
// compatibility entries remain accepted story IDs without claiming an active emitter.
export const PLACE_EVENTS = {
  train: {
    start: { id: 'start', source: 'engine' },
    approach: { id: 'approach', source: 'place', hook: 'arrive' },
    arrived: { id: 'arrived', source: 'place', hook: null },
    chime: { id: 'chime', source: 'place', hook: 'chime' },
  },
  gate: {
    start: { id: 'start', source: 'engine' },
    card_red: { id: 'card_red', source: 'place', hook: null },
    card_ok: { id: 'card_ok', source: 'place', hook: null },
    arch_blocked: { id: 'arch_blocked', source: 'compatibility' },
    gate_opened: { id: 'gate_opened', source: 'compatibility' },
  },
  forecourt: { start: { id: 'start', source: 'engine' } },
  plaza: { start: { id: 'start', source: 'engine' } },
  ferry_terminal: { start: { id: 'start', source: 'engine' } },
  print_shop: { start: { id: 'start', source: 'engine' } },
  campus: { start: { id: 'start', source: 'engine' } },
  canteen: { start: { id: 'start', source: 'engine' } },
  dorm_court: { start: { id: 'start', source: 'engine' } },
  dorms: { start: { id: 'start', source: 'engine' } },
  shotengai: { start: { id: 'start', source: 'engine' } },
  bakery: { start: { id: 'start', source: 'engine' } },
  konbini: { start: { id: 'start', source: 'engine' } },
  izakaya: { start: { id: 'start', source: 'engine' } },
  karaoke: { start: { id: 'start', source: 'engine' } },
  karaoke_booth: { start: { id: 'start', source: 'engine' } },
  east_lane: { start: { id: 'start', source: 'engine' } },
  east_coast: { start: { id: 'start', source: 'engine' } },
  dorm_commons: { start: { id: 'start', source: 'engine' } },
  sports: { start: { id: 'start', source: 'engine' } },
  pool: { start: { id: 'start', source: 'engine' } },
  gym: { start: { id: 'start', source: 'engine' } },
  office_quarter: { start: { id: 'start', source: 'engine' } },
  harbour: { start: { id: 'start', source: 'engine' } },
  works: { start: { id: 'start', source: 'engine' } },
  office: {
    kotodama_first: { id: 'kotodama_first', source: 'place', hook: 'teamDrinks' },
    kotodama_cancel: { id: 'kotodama_cancel', source: 'place', hook: 'teamDrinks' },
    kotodama_exit: { id: 'kotodama_exit', source: 'place', hook: 'teamDrinks' },
    start: { id: 'start', source: 'engine' },
    sat_down: { id: 'sat_down', source: 'place', hook: 'sitDown' },
  },
};
export function eventId(place, name) {
  const event = PLACE_EVENTS[place]?.[name];
  if (!event) throw new Error(`Unknown event ${place}:${name}`);
  return event.id;
}
export const eventTrigger = (place, name) => 'event:' + eventId(place, name);
