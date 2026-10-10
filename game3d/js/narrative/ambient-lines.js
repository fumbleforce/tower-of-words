// Lines nobody taps, shown as captions while something else happens (transition walks, ambient moments; the
// ambient list in the story files). A { say } line is a caption too, with its voice: it must never open the dialogue
// box, which waits for a tap, and outside a scene nothing would close it (Jørgen stuck on Mio's Wi-Fi line on the
// train, 2026-09-29). A hook here (a look) runs without Runner.step, which would close a scene's dialogue box.
import { ui, voice } from '../ui.js';
import { lineClip, audioKeys } from './voice-keys.js';
import { presentLine } from './heard-line.js';

// Japanese blurs here as in the text box (heard-line.js). An `en` caption is the one exception the design keeps:
// a rare exchange between two other people that the player is meant to follow (game3d/story/FORMAT.md).
const shownAs = (who, text, l = {}) => (l.en ? { heard: false, mixed: false } : presentLine(who, text, l));

export async function playAmbient(runner, lines, gap) {
  const hold = (text) => runner.game.wait(gap + Math.min(2500, text.length * 25));
  for (const l of lines || []) {
    if (typeof l === 'string') {
      const i = l.indexOf(': ');
      const sp = i > 0 && /^\w+$/.test(l.slice(0, i)) ? runner.speaker(l.slice(0, i)) : null;
      const text = sp ? l.slice(i + 2) : l.replace(/^>\s*/, '');
      const { heard, mixed } = sp ? shownAs(l.slice(0, i), text) : {};
      ui.caption(sp, text, { overheard: heard, mixed });
      await hold(l);
    } else if (l.say) {
      const { heard, mixed } = shownAs(l.say, l.text, l);
      const key = l.voice || lineClip(l.say, l.text, l.overheard) || (heard ? lineClip(l.say, l.text, true) : null);
      ui.caption(runner.speaker(l.say), l.text, { overheard: heard, mixed, clear: l.clear, en: l.en });
      const spoken = key && audioKeys.has(key) ? voice(key, { muffle: heard }) : null;
      await Promise.all([hold(l.text), window.__test ? null : spoken]);
    } else if (l.do) await runner.hook(l, null, '');
    else await runner.step(l);
  }
  ui.caption(null, '');
}
