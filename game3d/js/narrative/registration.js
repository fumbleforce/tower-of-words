// Declarations are checked against actual runtime registrations, not a second catalog.
export function assertRegistered(expected, actual, owner) {
  const wanted = new Set(expected);
  const keys = Object.keys(actual);
  const missing = expected.filter(key => !Object.hasOwn(actual, key));
  const extra = keys.filter(key => !wanted.has(key));
  if (missing.length || extra.length) {
    throw new Error(`${owner}: missing [${missing.join(', ')}], unexpected [${extra.join(', ')}]`);
  }
  return actual;
}

export function assertPlaceRegistered(place, name, details) {
  for (const field of ['things', 'spots', 'seats', 'zones', 'people', 'hooks']) {
    const expected = field === 'things' ? Object.keys(details.things) : details[field];
    assertRegistered(expected, place[field] || {}, `${name}.${field}`);
  }
  return place;
}
