// Entry content chronology. Authored dates remain visible; feedback never bumps work.
export function showcaseTime(entry, dates = {}) {
  const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  return Math.max(time(entry.updated), time(dates[entry.id])) || time(entry.date);
}

export function orderShowcase(entries, dates = {}) {
  return entries.map(entry => ({ ...entry, activity: showcaseTime(entry, dates) }))
    .sort((a, b) => b.activity - a.activity || a.id.localeCompare(b.id));
}
