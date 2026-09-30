// Lines nobody taps, shown as captions while something else happens (transition walks, ambient moments; the
// ambient list in the story files). A { say } line is a caption too, with its voice: it must never open the dialogue
// box, which waits for a tap, and outside a scene nothing would close it (Jørgen stuck on Mio's Wi-Fi line on the
// train, 2026-09-29). A hook here (a look) runs without Runner.step, which would close a scene's dialogue box.
import { ui, voice } from '../ui.js';
import { lineKey, heardKey, audioKeys } from './voice-keys.js';

export async function playAmbient(runner, lines, gap) {
  const hold = (text) => runner.game.wait(gap + Math.min(2500, text.length * 25));
  for (const l of lines || []) {
    if (typeof l === 'string') {
      const i = l.indexOf(': ');
      const sp = i > 0 && /^\w+$/.test(l.slice(0, i)) ? runner.speaker(l.slice(0, i)) : null;
      ui.caption(sp, sp ? l.slice(i + 2) : l.replace(/^>\s*/, ''));
      await hold(l);
    } else if (l.say) {
      const key = l.voice || (l.overheard ? heardKey(l.text) : lineKey(l.say, l.text));
      ui.caption(runner.speaker(l.say), l.text, { overheard: !!l.overheard, clear: l.clear, en: l.en });
      const spoken = audioKeys.has(key) ? voice(key, { muffle: !!l.overheard }) : null;
      await Promise.all([hold(l.text), window.__test ? null : spoken]);
    } else if (l.do) await runner.hook(l, null, '');
    else await runner.step(l);
  }
  ui.caption(null, '');
}
