// People react to how Eric speaks to them (issue #369). After a Say to someone, their answer runs as before; then,
// now and then, one short line from them on whether the word was in the register they expect (too casual, too stiff
// or just right). bonds/register-react.js decides when; the lines and the People panel notes are in
// story/conversations/register.js. The counters are story flags (regreact_*), so they ride in the save.
import { flags } from '../narrative/state.js';
import { known, SAYABLE } from '../lang.js';
import { WORD_REGISTER } from '../bonds/cast.js';
import { bonds, sim, remember } from '../sim.js';
import { verdict, decide } from '../bonds/register-react.js';
import { HANDLED, NOTES } from '../../story/conversations/register.js';

const get = (k) => flags[`regreact_${k}`];
const kindOf = (who, word) => verdict(bonds.cast[who]?.register, WORD_REGISTER[word]);
function lines(game, who, kind) {
  let n = 0;
  while (kind && game.story?.nodes?.[`register_${who}_${kind}_${n + 1}`]) n++;
  return n;
}

// an answer that runs on into a longer scene (a jump, a choice, a new goal, the camera) gets no reaction after it:
// by the end of Kenji's first meeting nobody remembers how Eric said good morning
const LONG = /"(go|call|choice)":|"do":"(cam|goal)"/;
const long = (game, answer) => !!answer && LONG.test(JSON.stringify(game.story?.nodes?.[answer] || []));

// counts this Say (word to who, answered by node `answer` or nothing) and returns the reaction to run after the answer
// (a function for game.beat or game.queue), or null
export function registerReaction(game, who, word, answer) {
  const kind = kindOf(who, word);
  const n = long(game, answer) ? 0 : lines(game, who, kind);
  const d = decide(get, {
    who,
    kind,
    day: sim.day,
    lines: n,
    handled: HANDLED.includes(answer),
  });
  for (const [k, v] of Object.entries(d.set)) flags[`regreact_${k}`] = v;
  if ((d.n || d.handled) && NOTES[who]?.[kind]) remember(game, who, `register_${kind}`, NOTES[who][kind]);
  if (!d.n) return null;
  const node = `register_${who}_${kind}_${d.n}`,
    place = game.place;
  return async () => {
    // only while they're still here: an answer can end somewhere else
    if (game.place !== place || !place?.people?.[who]) return;
    await game.runner.run(node);
  };
}

// whether some word he knows would still get a reaction from them today (a Say row on a person with no word of
// their own); the every-second-time and two-in-a-row limits aren't asked here, so the row stays put for the day
export function registerDue(game, who) {
  return SAYABLE.some((w) => {
    const kind = known.has(w) && kindOf(who, w);
    return (
      !!kind &&
      decide(get, {
        who,
        kind,
        day: sim.day,
        lines: lines(game, who, kind),
        peek: true,
      }).n > 0
    );
  });
}
