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
  dorm_court: { start: { id: 'start', source: 'engine' } },
  dorms: { start: { id: 'start', source: 'engine' } },
  shotengai: { start: { id: 'start', source: 'engine' } },
  east_lane: { start: { id: 'start', source: 'engine' } },
  office: {
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
