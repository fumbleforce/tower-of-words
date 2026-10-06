export const MONDAY_DETAILS = {
  office: { mio: { label: 'Mio', kind: 'person' } },
  karaoke_booth: { kenji: { label: 'Kenji', kind: 'person' } },
  dorm_commons: {
    mori: { label: 'Mr. Mori', kind: 'person' },
    aoi: { label: 'Aoi', kind: 'person' },
  },
  east_coast: { rei: { label: 'Rei', kind: 'person' } },
};

export function extendMondayCatalog(details) {
  for (const [name, people] of Object.entries(MONDAY_DETAILS)) {
    if (name === 'office') continue; // Mio is lifecycle's shared actor.
    for (const [id, info] of Object.entries(people)) {
      if (!details[name].people.includes(id)) details[name].people.push(id);
      details[name].things[id] = info;
    }
  }
  for (const [name, hooks] of Object.entries({
    office: ['day5Office', 'teamDrinks'],
    forecourt: ['labelRepair'],
    karaoke_booth: ['selectorRepair'],
    dorm_commons: ['day5Commons'],
  }))
    details[name].hooks.unshift(...hooks);
  details.dorm_commons.seats.push('d5_aoi_beside');
}
