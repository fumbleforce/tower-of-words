// The end of the day: the places it went through (a frame of each, taken in play), the people Eric met, and the
// words he can use now. No quiz and no score. The story's closing line (story `outro`) sits at the bottom, with
// the way back to the title. Photos come from menu.js (window.__shell.photos); faces from the portrait cut-outs.
import { ui, FACE, PORTRAITS } from './ui.js';
import { WORDS, COMMANDS, PHRASES, known, iconHTML } from './lang.js';
import { sim, PERIOD_NAMES } from './sim.js';
import { PLACE_NAMES } from './places/definitions.js';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
const ORDER = ['train', 'gate', 'office'];

// a round crop of a portrait's face, from its face box
function faceHTML(id, color, name, size = 56) {
  const f = FACE[id];
  if (!f || !PORTRAITS[id])
    return `<span class="face none" style="--c:${esc(color || '#8a93a3')}" aria-hidden="true">${esc((name || id)[0])}</span>`;
  const fh = f.f[3] - f.f[1],
    s = size / (fh * 1.55),
    cx = (f.f[0] + f.f[2]) / 2,
    cy = (f.f[1] + f.f[3]) / 2 - fh * 0.04;
  const src = new URL(
    `../assets/portraits/${id}-neutral.webp?v=${encodeURIComponent(window.BUILD || '')}`,
    import.meta.url,
  ).href;
  return `<span class="face" style="--c:${esc(color || '#8a93a3')};background-image:url('${src}');background-size:${(f.W * s).toFixed(1)}px ${(f.H * s).toFixed(1)}px;background-position:${(size / 2 - cx * s).toFixed(1)}px ${(size / 2 - cy * s).toFixed(1)}px" aria-hidden="true"></span>`;
}

// the day-2 hook as a closing card: the repair request Mio handed over (story `ticket`, with a default)
function ticketHTML(t) {
  if (!t) return '';
  return `<section class="ticket" aria-label="Repair request"><p class="tno">${esc(t.no || 'Repair request')}</p><p class="ttl">${esc(t.title || '')}</p>${(t.lines || []).map((l) => `<p class="tl">${esc(l)}</p>`).join('')}</section>`;
}
export function endHTML(game, { photos = {}, outro, ticket } = {}) {
  const shots = ORDER.filter((p) => photos[p])
    .map(
      (p) =>
        `<figure class="shot"><img alt="" src="${photos[p].src}"><figcaption><b>${PLACE_NAMES[p]}</b><span>${esc(PERIOD_NAMES[photos[p].period] || '')}</span></figcaption></figure>`,
    )
    .join('');
  const met = [...sim.met].filter((id) => id !== 'eric');
  const people = met
    .map((id) => {
      const p = sim.people[id] || {},
        sp = game.runner ? game.runner.speaker(id) : {};
      const name = p.name || sp.name || id,
        role = sp.role && sp.role !== 'you' ? sp.role : '';
      return `<li>${faceHTML(id, p.color || sp.color, name)}<span class="who"><b>${esc(name)}</b>${role ? `<span class="rl">${esc(role)}</span>` : ''}</span></li>`;
    })
    .join('');
  const word = (id) => {
    const w = WORDS[id];
    return `<li class="wrow">${iconHTML(id)}<span class="cw"><span class="jp">${esc(w.ja)}</span><span class="rd">${esc(w.ro)} · ${esc(w.en)}</span></span></li>`;
  };
  const ph = PHRASES.filter((id) => known.has(id)),
    cm = COMMANDS.filter((id) => known.has(id));
  return `<div class="card">
    <header class="dayhead"><h2>Day one</h2><p class="when">${esc(sim.date)} · ${esc(PERIOD_NAMES[sim.period] || 'After work')}</p></header>
    ${shots ? `<section class="today"><h3>Today</h3><div class="shots">${shots}</div></section>` : ''}
    <div class="cols">
      ${people ? `<section class="met"><h3>People you met</h3><ul class="people">${people}</ul></section>` : ''}
      ${ph.length || cm.length ? `<section class="words"><h3>Words you can use</h3>${ph.length ? `<ul class="wl">${ph.map(word).join('')}</ul>` : ''}${cm.length ? `<p class="sub2">Commands</p><ul class="wl cmds">${cm.map(word).join('')}</ul>` : ''}</section>` : ''}
    </div>
    ${ticketHTML(ticket)}
    <footer>${outro ? `<p class="outro">${esc(outro)}</p>` : ''}<button type="button" class="again primary">Back to title</button></footer>
  </div>`;
}

export async function showEnd(game) {
  const S = game.story || {};
  const outro = S.outro || 'Tomorrow morning: the station, the door sensor.';
  const ticket = S.ticket || {
    no: 'Repair request #2',
    title: 'Monorail doors: sensor check',
    lines: ['Raised by: Amakawa Station', 'Handed to: Eric (from Mio, B2)', 'Tomorrow morning, at the station.'],
  };
  document.body.classList.add('ended');
  // the scene fades out first, then the card comes in (QA round 1: the card faded in over live play)
  document.body.classList.add('ending');
  await new Promise((r) => setTimeout(r, 700));
  ui.showEnd(endHTML(game, { photos: (window.__shell && window.__shell.photos) || {}, outro, ticket }));
  const b = document.querySelector('#end .again');
  b.onclick = () => {
    document.body.classList.add('reloading');
    setTimeout(() => location.reload(), 200);
  };
  setTimeout(() => b.focus({ preventScroll: true }), 700);
  window.__ended = true;
}
