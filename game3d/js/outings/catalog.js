export const OUTING_PLACES = new Set(['shotengai', 'plaza', 'east_lane', 'east_coast', 'dorm_commons']);
export const COMPANION = { label: 'Kenji', kind: 'person' };

export function extendOutingCatalog(details) {
  for (const name of OUTING_PLACES) {
    if (!details[name].people.includes('kenji')) details[name].people.push('kenji');
    details[name].things.kenji ||= COMPANION;
  }
}
