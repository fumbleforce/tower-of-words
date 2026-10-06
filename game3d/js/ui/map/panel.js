// The map's place card and list (docs/game/controls-and-ui.md, The map): the picked place with its walking time,
// what's inside it and Go there, or the one line that says why he can't go; on desktop also every place, grouped.
// On the phone the card is a bottom sheet over the map; on desktop it is the side panel.
import { PINS, insideOf, pinOf } from '../../travel/pins.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// the pin's look: here, been here, not been yet, not open today
export const pinClass = (s) =>
  s.state === 'here' ? 'here' : s.state === 'closed' ? 'locked' : s.visited ? 'been' : 'new';
const LOCK =
  '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2.5" y="5" width="7" height="5.2" rx="1.2"/><path d="M4 5V3.8a2 2 0 0 1 4 0V5"/></svg>';
export const dot = (s) => `<i class="dot ${pinClass(s)}" aria-hidden="true">${s.state === 'closed' ? LOCK : ''}</i>`;

// the card's second line: been here or not, and how far on foot
function sub(s, states) {
  if (s.state === 'here') return 'You are here';
  const parts = [];
  const pin = pinOf(s.id);
  if (pin.name !== s.id) parts.push(`In ${esc(states[pin.name]?.name || pin.name)}`);
  if (s.state !== 'closed') parts.push(s.visited ? 'Been here' : 'Not been here yet');
  if (s.route) parts.push(`about ${s.route.minutes} min on foot`);
  return parts.join(' · ');
}

// the card for the picked place; phone: with Cancel
export function cardHTML(s, states, { phone }) {
  if (!s)
    return `<p class="mv-tip">${phone ? 'Tap a place to see it. Drag or pinch to move the map.' : 'Pick a place on the map or in the list.'}</p>`;
  const inside = insideOf(s.id)
    .map((id) => states[id])
    .filter((x) => x && x.state !== 'hidden');
  const canGo = s.state === 'go';
  const why = s.state !== 'go' && s.state !== 'here' ? s.reason : '';
  return `
    <h2 class="mv-name">${esc(s.name)}</h2>
    <p class="mv-sub">${sub(s, states)}</p>
    ${why ? `<p class="mv-why">${esc(why)}</p>` : ''}
    ${
      inside.length
        ? `<ul class="mv-inside">${inside
            .map(
              (x) =>
                `<li><button type="button" data-pick="${x.id}">${dot(x)}<span class="nm">${esc(x.name)}</span><span class="nt">${x.state === 'here' ? 'here' : x.visited ? '' : 'not been yet'}</span></button></li>`,
            )
            .join('')}</ul>`
        : ''
    }
    ${
      s.state === 'here'
        ? ''
        : `<div class="mv-btns">${phone ? '<button type="button" class="mv-cancel">Cancel</button>' : ''}<button type="button" class="mv-go"${canGo ? '' : ' disabled'}>Go there${phone ? '' : ' <kbd>Enter</kbd>'}</button></div>`
    }`;
}

const GROUPS = [
  ['Here', (s) => s.state === 'here'],
  ['Fast travel', (s) => s.state === 'go' || s.state === 'wait'],
  ["Can't go now", (s) => ['scene', 'later', 'stuck'].includes(s.state)],
  ['Not open today', (s) => s.state === 'closed'],
];
// every pinned place (and the place he's in), grouped; desktop only
export function listHTML(states, picked) {
  const rows = Object.values(states).filter(
    (s) => s.state !== 'hidden' && (PINS[s.id]?.at || s.id === 'office' || s.state === 'here'),
  );
  return GROUPS.map(([title, test]) => {
    const g = rows.filter(test).sort((a, b) => (a.route?.units ?? 0) - (b.route?.units ?? 0));
    if (!g.length) return '';
    return `<h3>${title}</h3><ul>${g
      .map(
        (s) =>
          `<li><button type="button" data-pick="${s.id}" class="${s.id === picked ? 'on' : ''}">${dot(s)}<span class="nm">${esc(s.name)}</span><span class="nt">${s.route && s.state === 'go' ? `${s.route.minutes} min` : ''}</span></button></li>`,
      )
      .join('')}</ul>`;
  }).join('');
}
