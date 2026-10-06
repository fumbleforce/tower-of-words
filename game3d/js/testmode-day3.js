// ?test=fast on day 3: Saturday has no single goal to follow (story/day3/README.md), so the driver plays a route
// through the day the way a player might: the room's computer, the board (Aoi, the swimming slip, the map's word),
// the station (the witnessed door check, the monitor), the gym's booking terminal and printer, home to rest until
// evening, the swimming club at the pool, and home to sleep. Each step is [place, thing to use, replies to prefer];
// a step for another place waits until the player is there, and steps of places left behind are skipped. The
// testmode driver (testmode.js) runs it before its own goal-following.
export const DAY3_ROUTE = [
  ['dorms', 'computer', ['Open repair requests']],
  ['dorms', 'door_out'],
  ['dorms', 'stairs_down'],
  ['dorm_court', 'street_gate'],
  ['east_lane', 'plaza_lane'],
  ['plaza', 'noticeboard', ['Tell her not to worry']],
  ['plaza', 'board_map', ['Try saying']],
  ['plaza', 'office_lane'],
  ['forecourt', 'station_exit'],
  ['gate', 'guard', ['Do the final door check']],
  ['train', 'door_test', ['Run the final check']],
  ['train', 'station_exit'],
  ['gate', 'guard', ['Look at the monitor', 'Seat the loose connector']],
  ['gate', 'forecourt_way'],
  ['forecourt', 'plaza_lane'],
  ['plaza', 'dorm_lane'],
  ['east_lane', 'north_street'],
  ['sports', 'gym'],
  ['gym', 'booking_terminal', ['Restart the terminal']],
  ['gym', 'gym_printer', ['Press Print']],
  ['gym', 'gym_door'],
  ['sports', 'north_street'],
  ['east_lane', 'dorm_gate'],
  ['dorm_court', 'stairs'],
  ['dorms', 'computer', ['Rest until evening']],
  ['dorms', 'door_out'],
  ['dorms', 'stairs_down'],
  ['dorm_court', 'street_gate'],
  ['east_lane', 'north_street'],
  ['sports', 'pool', ['Swim with Kuro', 'Sit with them after the swim']],
  ['pool', 'changing_room'],
  ['sports', 'north_street'],
  ['east_lane', 'dorm_gate'],
  ['dorm_court', 'stairs'],
  ['dorms', 'bed', ['Sleep.']],
];

// one tick of the route: true when it acted (or is waiting on its place), false once it has nothing to do here
export function day3Tick(game, T, R, route = DAY3_ROUTE) {
  const place = game.place.name;
  if (route[R.i] && route[R.i][0] !== place) {
    const j = route.findIndex((s, k) => k > R.i && s[0] === place);
    if (j > 0) R.i = j;
  }
  const step = route[R.i];
  if (!step || step[0] !== place) return false;
  const m = game.markers.list.find((x) => x.id === step[1]);
  const t = game.place.things[step[1]];
  if ((!m || !m.enabled()) && t?.noMarker && t.face) {
    // a way out with no pin (the station's door from the forecourt): walk into it, as a player does
    T.log.push(`route: ${place} walk:${step[1]}`);
    game.walker.goTo(...t.face());
    R.i++;
    return true;
  }
  if (!m || !m.enabled()) {
    // not there yet (someone walking off, a scene's end): wait a little, then go on without it
    if (++R.wait < 120) return true;
    T.log.push(`route: ${place} ${step[1]} never there`);
  } else {
    T.prefer = step[2] || [];
    T.log.push(`route: ${place} use:${step[1]}`);
    game.use(m);
  }
  R.wait = 0;
  R.i++;
  return true;
}
// a reply the route asked for, when it's offered
export function preferred(T, chips) {
  const text = (c) => String(c.html).replace(/<[^>]+>/g, '');
  for (const want of T.prefer || []) {
    const i = chips.findIndex((c) => text(c).includes(want));
    if (i >= 0) return i;
  }
  return -1;
}
