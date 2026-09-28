// The end card: the commands Mio picked up, and how many odd reactions you found, out of how many there are.
import { ui } from './ui.js';
import { WORDS, COMMANDS, known } from './lang.js';
import { flags } from './runner.js';

export async function showEnd(game) {
  let total = 0;
  for (const p of Object.values(game.prepared)) {
    const s = (await p).story; if (!s || !s.on) continue;
    total += Object.keys(s.on).filter((k) => /^say:\w+:(?!\*)/.test(k)).length;
  }
  const cmds = COMMANDS.filter((id) => known.has(id)).map((id) => { const w = WORDS[id]; return `<li><span class="now"><span class="jp">${w.ja}</span></span><span class="was">${w.ro} · ${w.en}</span></li>`; }).join('');
  const outro = (game.story && game.story.outro) || 'Tomorrow is day two.';
  const html = `<div class="card">
    <h2>Day one, done</h2>
    <p class="sub">${outro}</p>
    <h3>Words that work for you</h3>
    <ul class="w">${cmds}</ul>
    ${total ? `<h3>Odd things you found</h3><div class="compare">${game.found.size} of ${total}. Everything reacts to the words, and some things do more than you'd think.</div>` : ''}
    <button type="button" class="again">Play again</button>
  </div>`;
  ui.showEnd(html);
  document.querySelector('#end .again').onclick = () => location.reload();
  window.__ended = true; void flags;
}
