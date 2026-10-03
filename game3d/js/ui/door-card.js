// The card on a shut door, shown on screen beside the line that reads it. The shop doors face across their streets,
// so from the play camera their cards are edge-on; when Eric tries a door, the narration line that mentions the card
// (or its kana) gets a picture of it beside the box: the card's own colours, the kana large, any notice line, the
// English small. The cards come from the scenes (scenes/door-cards.js doorCard: the one up for the day and time).
//   installDoorCards(game, now)   now() -> { day, period }; each talk: trigger picks its door's card, a node's end
//                                 or any other trigger drops it
//   showDoorCard(talkEl, text)    called by the dialogue for each narration line (text null: hide)
import { doorCard } from '../scenes/door-cards.js';

let current = null;

export function installDoorCards(game, now) {
  const onTrigger = game.onTrigger,
    onNode = game.onNode;
  game.onTrigger = (key) => {
    const { day, period } = now();
    current = key.startsWith('talk:') ? doorCard(key.slice(5), day, period) : null;
    onTrigger?.(key);
  };
  game.onNode = (node, phase) => {
    if (phase === 'end') current = null;
    onNode?.(node, phase);
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mentions = (text, c) => /\bcards?\b/i.test(text) || text.includes(c.kana);

export function showDoorCard(talkEl, text) {
  let el = talkEl.querySelector('.doorcard');
  const c = text && current && mentions(text, current) ? current : null;
  if (!c) {
    if (el) el.hidden = true;
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.className = 'doorcard';
    talkEl.appendChild(el);
  }
  el.innerHTML =
    `<b lang="ja">${esc(c.kana)}</b>` + (c.sub ? `<i lang="ja">${esc(c.sub)}</i>` : '') + `<span>${esc(c.en)}</span>`;
  el.setAttribute('aria-label', `The card says ${c.kana}${c.sub ? ' ' + c.sub : ''}: ${c.en}`);
  el.hidden = false;
}
