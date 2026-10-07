// Additional hosts in existing rooms after the opening week.
export const EXTRA = { karaoke_booth: { kuroda: { label: 'Man from the train', kind: 'person' } } };
export function extendOngoingCatalog(details) {
  for (const [name, people] of Object.entries(EXTRA))
    for (const [id, info] of Object.entries(people)) {
      if (!details[name].people.includes(id)) details[name].people.push(id);
      details[name].things[id] = info;
    }
}
