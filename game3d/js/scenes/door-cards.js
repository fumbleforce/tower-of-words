import { bakeryOpen } from '../gameplay/shop-hours.js';
// The signs that change with the day, and the cards on the shut doors, kept apart from the drawing (shop-signs.js)
// so the dialogue can read them without three.js.
//   WHEN                                   which signs show when: when(day, period) -> shown
//   registerDoorCard(id, when, card)       shop-signs.js card({ door }): the card { kana, en, sub } on door `id`
//   doorCard(id, day, period)              the card up on that door now, or null (ui/door-card.js)

// which signs show when, for the ones that change with the day (a shop's door card): day 1's 準備中 card stays all
// day; on day 2 it is up in the morning, and after work the evening cards take its place (story/day2/README.md)
export const WHEN = {
  bakeryClosed: (day, period) => !bakeryOpen(day, period) && !(day === 2 && period === 'evening'),
  prep: (day, period) => !(day === 2 && period === 'evening'),
  prep2: (day, period) => day === 2 && period !== 'evening', // a door open on the other days (the karaoke box)
  evening2: (day, period) => day === 2 && period === 'evening',
};

// by the door's thing id: from the play camera the doors face across the street and their cards are edge-on, so
// trying a door shows its card on screen
const DOORS = new Map(); // id -> Map(when -> { kana, en, sub })
export function registerDoorCard(id, when, card) {
  (DOORS.get(id) || DOORS.set(id, new Map()).get(id)).set(when, card);
}
export function doorCard(id, day, period) {
  if (id === 'bakery_door') id = 'bakery';
  for (const [when, card] of DOORS.get(id) || []) if (!when || WHEN[when](day, period)) return card;
  return null;
}
