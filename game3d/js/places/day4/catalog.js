// Additional Sunday people and interactions, also registered while other days are loaded.
export const ADDITIONS = {
  forecourt: { people: { kuroda: 'Mr. Hamada' } },
  east_coast: { people: { kuro: 'Receptionist', tama: 'Tama' } },
  dorm_commons: { people: { mori: 'Mr. Mori' } },
  karaoke: { people: { kuroda: 'Mr. Hamada' } },
  sports: {
    people: { aoi: 'Woman from the train', member: 'Club member' },
    things: {
      bench_ball: {
        label: 'Ball by the bench',
        kind: 'thing small',
        verb: 'Look',
      },
    },
    hooks: ['courtRepair', 'tennisSession'],
  },
  pool: {
    things: {
      pool_notice: { label: 'Pool notice', kind: 'thing small', verb: 'Read' },
    },
  },
  gym: { hooks: ['fanRepair'] },
};
export function extendSundayCatalog(details) {
  for (const [name, add] of Object.entries(ADDITIONS)) {
    const d = details[name];
    for (const [id, label] of Object.entries(add.people || {})) {
      d.people.push(id);
      d.things[id] = { label, kind: 'person' };
    }
    Object.assign(d.things, add.things);
    d.hooks.push(...(add.hooks || []));
  }
}
