// The required beats of a fast-test day: each is a flag the story sets when the job is done (day 3's station jobs,
// day 5's Kuro label and B2 reveal). testmode.js asks for them at the end of the day. A run that never got to one
// fails with the beat's name, so a route that skips it cannot pass.
export function missingBeats(beats, flags, places, what) {
  return beats
    .filter((b) => !flags[b.flag])
    .map(
      (b) =>
        `${what} not done: ${b.beat} (${b.flag} not set)` +
        (places.includes(b.place) ? '' : `; the run never reached the ${b.place}`),
    );
}
