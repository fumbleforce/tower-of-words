// The People panel's cards (docs/game/controls-and-ui.md, Panels: People): one per person Eric has met (sim.js
// peopleData), with their bond as five hearts (one per step, systems.md Bonds) and a line on where things stand.
// It shows the step only: never what the next step needs or what it opens.
// Each card leads with the person's face, cropped from their neutral portrait as the backlog does: `face(id)` is
// portraits.js thumbStyle, passed in by ui.js when the panel opens (so this stays loadable in Node, and a private
// plugin's stand-in shows here too). The initial sits under it: it shows while the picture loads, and for anyone with
// no portrait yet. A background picture is only fetched once the panel is open.
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const BOND_LINES = [
  'Strangers still.',
  "You've met. Still getting to know each other.",
  'Friendly. Glad to see you around.',
  'They trust you.',
  'Close. You matter to each other.',
  'As close as it gets.',
];
const HEART = '<path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5z"/>';
export function hearts(step, max = 5) {
  let h = '';
  for (let n = 1; n <= max; n++) h += `<svg viewBox="0 0 24 24" class="${n <= step ? 'on' : 'off'}">${HEART}</svg>`;
  return h;
}

// "The guard" and "Mr. Mori" go under G and M
const initial = (name) => name.replace(/^(The|Mr\.|Mrs\.|Ms\.)\s+/, '')[0] || '?';
function pic(d, faceOf) {
  const face = faceOf(d.id, 'neutral');
  return (
    `<span class="pic${face ? ' has' : ''}" style="--c:${d.color}" aria-hidden="true">${esc(initial(d.name))}` +
    (face ? `<span class="face" style="${face}"></span>` : '') +
    '</span>'
  );
}

export function peopleCards(list, faceOf = () => '') {
  if (!list.length) return '<p class="none">Nobody yet.</p>';
  return list
    .map((d) => {
      const cmds = d.taught.map((c) => `<span class="jp">${c.ja}</span> <span class="gl">${c.en}</span>`).join(' ');
      const known = d.known.slice(-4).map(esc).join('<br>');
      const rem = d.remembers.slice(0, 2).map(esc).join('<br>');
      const line = BOND_LINES[d.step] || BOND_LINES[1];
      return (
        `<li data-id="${d.id}" data-step="${d.step}">${pic(d, faceOf)}` +
        `<span class="nm">${esc(d.name)} <small class="st">${d.stepName}</small></span>` +
        `<span class="bd" role="img" aria-label="Bond ${d.step} of 5: ${d.stepName}">${hearts(d.step)}</span>` +
        `<span class="stand">${line}</span>` +
        `<span class="ab">${esc(d.about)}</span>` +
        (known ? `<span class="ab kn">${known}</span>` : '') +
        (rem ? `<span class="ab rm">They remember: ${rem}</span>` : '') +
        (cmds ? `<span class="cm">Taught you: ${cmds}</span>` : '') +
        '</li>'
      );
    })
    .join('');
}
