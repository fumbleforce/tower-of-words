import { PLACE_NAMES, TRIPS } from '../places/definitions.js';
import { BAKERY_FIRST_DAY, BAKERY_HOURS } from './shop-hours.js';
import { dateOf } from '../bonds/model.js';
import { PINS } from '../travel/pins.js';
export const DIRECTORY_ID = 'island_directory';
const GROUPS = [['forecourt', 'campus', 'plaza'], ['shotengai', 'east_coast'], ['sports']];
// Locations follow the same parent-place table as the map. Unauthored clock hours are never invented.
export function directoryPages() {
  const included = new Set([
    'bakery',
    'office',
    'print_shop',
    'canteen',
    'izakaya',
    'karaoke',
    'dorm_commons',
    'gym',
    'pool',
  ]);
  return GROUPS.map((places, index) => {
    const rows = places.flatMap((place) => {
      const venues = Object.entries(PINS)
        .filter(([id, p]) => included.has(id) && p.in === place)
        .map(
          ([id]) =>
            PLACE_NAMES[id] +
            (id === 'bakery' ? '\nOpens ' + dateOf(BAKERY_FIRST_DAY) + '; ' + BAKERY_HOURS.join(', ') + '.' : ''),
        );
      const adjacent = (TRIPS[place] || []).filter((id) => PINS[id]?.at).map((id) => PLACE_NAMES[id]);
      return [
        PLACE_NAMES[place] +
          ': ' +
          venues.join(' · ') +
          (adjacent.length ? '\nWalks to ' + adjacent.join(', ') + '.' : ''),
      ];
    });
    return 'ISLAND DIRECTORY · ' + (index + 1) + ' / ' + GROUPS.length + '\n\n' + rows.join('\n\n');
  });
}
