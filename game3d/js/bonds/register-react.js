// When a person reacts to the register of the word Eric just said to them (issue #369). No DOM and no engine, so
// node can test it (game3d/test/unit/register-react.test.mjs); gameplay/register-reactions.js is the glue.
//
//   verdict(want, have): 'right', 'casual' (too casual with them), 'stiff' (too stiff with them) or null
//   decide(get, { who, kind, day, lines, handled, peek }): whether this Say gets reaction line n (1-based, 0 = none),
//     and the counters to store. get(key) reads them back (the glue keeps them in story flags, so they ride in the save).
//
// So it never nags: at most one reaction per person per day, never on two Says in a row (GAP), "just right" only
// every second time he gets it right, and each line once, in order; a kind that has run out stays quiet. An authored
// answer that already reacts to the register (`handled`) uses up the day's reaction without a line of its own.

export const GAP = 1; // Says without a reaction between two reactions

export function verdict(want, have) {
  if (!want || !have) return null;
  if (want === have) return 'right';
  return have === 'casual' ? 'casual' : 'stiff';
}

export function decide(get, { who, kind, day, lines = 0, handled = false, peek = false }) {
  const set = {};
  const gap = get('gap') ?? GAP;
  set.gap = gap + 1;
  if (!who || !kind) return { n: 0, set };
  const count = (get(`${who}_${kind}`) || 0) + 1;
  set[`${who}_${kind}`] = count;
  const shown = get(`${who}_${kind}_shown`) || 0;
  const free = get(`${who}_day`) !== day && (peek || gap >= GAP);
  if (handled && free)
    return {
      n: 0,
      handled: true,
      set: { ...set, gap: 0, [`${who}_day`]: day },
    };
  const every = peek || kind !== 'right' || count % 2 === 0;
  if (!free || !every || shown >= lines) return { n: 0, set };
  return {
    n: shown + 1,
    set: {
      ...set,
      gap: 0,
      [`${who}_day`]: day,
      [`${who}_${kind}_shown`]: shown + 1,
    },
  };
}
