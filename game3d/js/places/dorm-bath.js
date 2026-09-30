// The dorm courtyard's sento after work (places/dorm-court.js): a man inside hums the monorail's door chime and
// never finishes it. The phrase plays every so often while Eric is in the court, louder and panned toward the door
// as he gets near, so he can find the bath by ear. `bathSong` (state 'answer') is the discovery: the hummer starts
// his last try, stops short, and a second man finishes the tune, worse; it returns once the second voice is done,
// so the story's caption comes after the sound. Muted or before audio is unlocked it only pauses briefly.
// The sounds: game3d/audio/sfx/bath_first.mp3 and bath_answer.mp3, made by tools/feel/hum.py.
import { sfx, duration, running, isMuted } from '../sfx.js';
import { SENTO } from '../scenes/dorm-court/plan.js';

// times in bath_first and bath_answer (tools/feel/hum.py): where the first man's third, unfinished try starts (with
// its in-breath), and after that point when the second man comes in and when he's done
const LAST_TRY = 4.3,
  ANSWER_AT = 1.9,
  ANSWER_DONE = 3.9;
const HEAR = 11; // metres: beyond this the humming is out of earshot

export function dormBath(game) {
  const door = [SENTO.x0 + 0.95, SENTO.z]; // the lit doorway under the ゆ noren (scenes/dorm-court/frontages.js)
  const spot = [door[0], SENTO.z + 0.6]; // on the walk's leg to the door, a step short of the curtain
  let live = null,
    t = 0,
    liveEnd = 0,
    next = 1.5,
    answering = false;
  const where = () => {
    const p = game.player.root.position,
      d = Math.hypot(p.x - door[0], p.z - door[1]);
    return {
      gain: Math.max(0, Math.min(1, 1.1 - d / HEAR)) ** 1.6,
      pan: Math.max(-0.6, Math.min(0.6, (door[0] - p.x) / 7)),
    };
  };
  const hush = (ms = 300) => {
    live?.stop(ms);
    live = null;
  };
  return {
    spot,
    // the `bath` thing's pin over the noren, where he stands, what he faces
    anchor: (v) => v.set(door[0], 1.55, door[1] + 0.1),
    face: () => door,
    bathSong: async ({ state = 'answer' } = {}) => {
      if (state !== 'answer') return;
      answering = true;
      hush(250);
      try {
        if (!running() || isMuted()) {
          await game.wait(1200);
          return;
        }
        const { pan } = where();
        sfx('bath_first', { offset: LAST_TRY, pan });
        await game.wait(ANSWER_AT * 1000);
        sfx('bath_answer', { pan });
        await game.wait(ANSWER_DONE * 1000);
      } finally {
        answering = false;
        next = t + 5; // he starts again a little later, as before
      }
    },
    update(dt) {
      t += dt;
      if (live) {
        if (t > liveEnd) live = null;
        else {
          const { gain, pan } = where(),
            now = live.gain.context.currentTime;
          live.gain.gain.setTargetAtTime(gain, now, 0.15);
          live.panner?.pan.setTargetAtTime(pan, now, 0.15);
        }
        return;
      }
      if (answering || t < next || !running()) return;
      const { gain, pan } = where();
      next = t + 3;
      if (gain < 0.02) return;
      const s = sfx('bath_first', { gain, pan });
      if (!s.gain) return; // muted, or the file not loaded yet: try again shortly
      live = s;
      liveEnd = t + (duration('bath_first') || 6.9);
      next = liveEnd + 4 + Math.random() * 4;
    },
    leave() {
      hush(400);
      next = t + 1.5;
    },
  };
}
