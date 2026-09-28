// Word practice (Jørgen, 2026-09-28): "Up until you have written/said it a few times, you still have to type it /
// say it in the game, so it is not just clicking it." Each word Eric can say counts how often he has typed or said
// it successfully (the typing prompt where it's taught counts as the first). Below the bar, choosing it in the
// Say menu opens the small type-or-say prompt; from the bar on, a click is enough. Never a gate: the prompt shows the
// romaji and the English, helps after a few tries, and can be backed out of.
//
//   import { needsPractice, notePractice, practiced, masteryNeeded, pipsHTML } from './mastery.js'
//
// The counts live in the story flags (`practice_<id>`), so they are saved and loaded with the game as they are.

import { flags } from './runner.js';
import { settings } from './settings.js';

export const MASTERY_DEFAULT = 3;
// how many successful tries a word needs before it's a click (Settings can change it: settings.masteryUses)
export function masteryNeeded() {
  const n = Math.round(+(settings && settings.masteryUses));
  return Number.isFinite(n) && n >= 0 ? n : MASTERY_DEFAULT;
}
export const practiced = (id) => +flags['practice_' + id] || 0;
export const needsPractice = (id) => practiced(id) < masteryNeeded();

// one more success. how: 'typed' | 'voice'. Returns { count, mastered } (mastered is true on the try that crosses the bar)
export function notePractice(id, how = 'typed') {
  const before = practiced(id), count = before + 1;
  flags['practice_' + id] = count;
  if (how === 'voice') flags['voiced_' + id] = true;
  return { count, mastered: before < masteryNeeded() && count >= masteryNeeded() };
}

// the progress marks for the Words panel and the Say menu: filled dots for each try, then a small "by heart"
export function pipsHTML(id) {
  const n = masteryNeeded(), c = Math.min(practiced(id), n);
  if (!n) return '';
  if (c >= n) return '<span class="mp done" title="You can pick it straight from the Say menu now">by heart</span>';
  let dots = ''; for (let i = 0; i < n; i++) dots += `<i class="${i < c ? 'on' : ''}"></i>`;
  return `<span class="mp" role="img" aria-label="Said or typed ${c} of ${n} times">${dots}</span>`;
}

// the styles for the marks (ui.js may move them into css/style.css)
export const MASTERY_CSS = `
.mp { display: inline-flex; gap: 4px; align-items: center; margin-left: auto; flex: none; }
.mp i { width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid rgba(111, 208, 198, .6); }
.mp i.on { background: var(--accent, #6fd0c6); border-color: var(--accent, #6fd0c6); }
.mp.done { font-size: 12px; color: var(--accent, #6fd0c6); letter-spacing: .02em; }
`;
