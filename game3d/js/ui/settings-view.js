// The Settings panel (docs/game/controls-and-ui.md, Settings): six sections behind tabs, a rail on the left on
// desktop and a strip of tabs under the header on the phone. The panel never grows past the screen; a section that
// doesn't fit scrolls inside it. What each setting does, its storage and its default are in settings.js.
//   const view = settingsView({ openLayer, closeLayer, trap }); view.open(); view.captureKey(e) in the key handler
// Keys: Tab moves through everything, Up and Down go from row to row (and tab to tab on the rail), Left and Right
// change the focused choice, slider or switch, PageUp and PageDown change section, Esc closes (menu.js).
import { settings, setSetting, onSettings, qualityTier } from '../settings.js';
import { sfx, keyLabel } from '../ui.js';
import { browserSpeechAvailable, prepareVoice } from '../speech.js';
import { el } from './dom.js';

const seg = (key, label, options, help = '') => ({ kind: 'seg', key, label, options, help });
const sw = (key, label, help = '') => ({ kind: 'sw', key, label, help });
const vol = (key, label) => ({ kind: 'range', key, label });
const SAY_HELP = 'Talk is E, Space or Enter';
const VOICE_NOTE = {
  device:
    'Runs in the game. A one-time download (77 MB on a computer, 147 MB on a phone), then it works offline. What you say stays on this device.',
  browser: "Uses the browser's own recogniser. Chrome sends what you say to Google.",
  off: 'Type the words. Voice is optional.',
};
const SECTIONS = [
  [
    'text',
    'Text',
    [
      seg('textSpeed', 'Text speed', [
        ['slow', 'Slow'],
        ['normal', 'Normal'],
        ['fast', 'Fast'],
        ['instant', 'Instant'],
      ]),
      sw('autoAdvance', 'Auto-advance', "Lines move on by themselves once they've been spoken"),
    ],
  ],
  [
    'sound',
    'Sound',
    [
      sw('voiceOn', 'Spoken lines', 'People say their lines out loud'),
      vol('master', 'Master volume'),
      vol('music', 'Music'),
      vol('voice', 'Voices'),
      vol('ambience', 'Ambience'),
    ],
  ],
  [
    'graphics',
    'Graphics',
    [
      seg(
        'quality',
        'Graphics quality',
        [
          ['auto', 'Auto'],
          ['low', 'Low'],
          ['medium', 'Medium'],
          ['high', 'High'],
        ],
        ' ',
      ),
      sw('surfaces', 'Surface detail', 'Patterns in floors, walls, fabric and metal'),
      sw(
        'chibi',
        'Chibi cast',
        'Eric, Mio and the people they meet as chibi figures, from the next time the game loads',
      ),
      sw('perfOverlay', 'Performance numbers', 'Frame rate and draw calls in a corner<span class="desk"> (F3)</span>'),
    ],
  ],
  [
    'controls',
    'Controls',
    [
      { kind: 'key', key: 'keySay', label: 'Say key', help: SAY_HELP },
      seg('uiSize', 'Interface size', [
        [0.85, 'Small'],
        [1, 'Normal'],
        [1.2, 'Large'],
        [1.4, 'Larger'],
      ]),
      sw('reduceMotion', 'Reduce motion', 'Less camera sway and fewer moving parts in menus'),
    ],
  ],
  [
    'voice',
    'Voice & learning',
    [
      seg(
        'voiceInput',
        'Voice input',
        [
          ['off', 'Off'],
          ['device', 'On this device'],
          ['browser', 'Browser'],
        ],
        ' ',
      ),
      seg(
        'masteryUses',
        'Tries before a word is one click',
        [
          [1, '1'],
          [3, '3'],
          [5, '5'],
        ],
        'How many times you type or say a word before Say sends it with one click',
      ),
    ],
  ],
  [
    'private',
    'Private',
    [sw('privateMode', 'Private mode', 'Adult scenes on this device. Off on a phone until you turn this on.')],
  ],
];
const RESERVED = /^(Escape|Tab|Enter|Space|Key[WASDE]|Arrow\w+|Digit\d|Shift\w*|Control\w*|Alt\w*|Meta\w*)$/;
const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function control(r) {
  const lab = `aria-labelledby="sl-${r.key}"`;
  if (r.kind === 'seg') return `<div class="seg" role="radiogroup" ${lab} data-key="${r.key}"></div>`;
  if (r.kind === 'sw')
    return `<button type="button" class="sw" role="switch" data-key="${r.key}" ${lab}><i></i></button>`;
  if (r.kind === 'key') return `<button type="button" class="keybind" data-key="${r.key}" ${lab}></button>`;
  return `<span class="rng"><input type="range" min="0" max="100" step="5" data-key="${r.key}" ${lab}><output></output></span>`;
}
const rowHtml = (r) =>
  `<div class="srow k-${r.kind}" data-row="${r.key}"><div class="lbl"><span id="sl-${r.key}">${r.label}</span>` +
  `${r.help ? `<small class="help" id="sh-${r.key}">${r.help.trim()}</small>` : ''}</div><div class="ctl">${control(r)}</div></div>`;

export function settingsView({ openLayer, closeLayer, trap }) {
  let s = null,
    tab = 'text',
    listening = null;
  const help = (key) => s.querySelector(`#sh-${key}`);

  function build() {
    s = el(
      'div',
      'layer setpanel',
      `<div class="scrim" data-close></div>
      <section class="pane" role="dialog" aria-modal="true" aria-labelledby="setTitle">
        <header class="shead"><h2 id="setTitle">Settings</h2><button type="button" class="x" data-close aria-label="Close settings">${X}</button></header>
        <div class="sbody">
          <nav class="stabs" role="tablist" aria-label="Sections">${SECTIONS.map(
            ([id, name]) =>
              `<button type="button" role="tab" id="st-${id}" data-tab="${id}" aria-controls="sp-${id}">${name}</button>`,
          ).join('')}</nav>
          <div class="spanels">${SECTIONS.map(
            ([id, , rows]) =>
              `<div class="spanel" role="tabpanel" id="sp-${id}" data-tab="${id}" aria-labelledby="st-${id}" hidden>${rows.map(rowHtml).join('')}</div>`,
          ).join('')}</div>
        </div>
      </section>`,
    );
    s.id = 'settings';
    s.hidden = true;
    document.body.appendChild(s);
    for (const g of s.querySelectorAll('.seg')) {
      const k = g.dataset.key;
      const row = SECTIONS.flatMap((x) => x[2]).find((r) => r.key === k);
      for (const [v, l] of row.options) {
        if (k === 'voiceInput' && v === 'browser' && !browserSpeechAvailable()) continue;
        const b = el('button', '', l);
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.dataset.v = v;
        b.onclick = () => choose(k, v);
        g.appendChild(b);
      }
    }
    for (const b of s.querySelectorAll('.sw'))
      b.onclick = () => {
        setSetting(b.dataset.key, !settings[b.dataset.key]);
        sfx('tap');
      };
    for (const r of s.querySelectorAll('input[type=range]')) {
      r.addEventListener('input', () => setSetting(r.dataset.key, +r.value / 100));
      r.addEventListener('change', () => r.dataset.key !== 'music' && sfx('tap'));
    }
    const kb = s.querySelector('.keybind');
    kb.onclick = () => {
      if (listening) return stopListen();
      listening = kb;
      kb.classList.add('listening');
      kb.textContent = 'Press a key';
      help('keySay').textContent = 'Esc to cancel';
    };
    kb.addEventListener('blur', () => listening && stopListen());
    for (const t of s.querySelectorAll('[role=tab]')) t.onclick = () => show(t.dataset.tab, true);
    s.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeLayer(s)));
    s.addEventListener('keydown', (e) => {
      nav(e);
      if (!e.defaultPrevented) trap(s, e);
      e.stopPropagation();
    });
    show(tab);
  }

  function choose(k, v) {
    setSetting(k, v);
    sfx('tap');
    if (k !== 'voiceInput') return;
    const note = help('voiceInput');
    note.textContent = VOICE_NOTE[v] || '';
    if (v === 'device')
      prepareVoice((f) => (note.textContent = `Downloading the voice model: ${Math.round(f * 100)}%`))
        .then(() => (note.textContent = VOICE_NOTE.device))
        .catch(() => (note.textContent = "Couldn't load the voice model. Typing still works."));
  }

  // one section shows at a time; the rail's tab is the one in the tab order (roving tabindex)
  function show(id, focusTab = false) {
    tab = id;
    for (const t of s.querySelectorAll('[role=tab]')) {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) {
        t.focus({ preventScroll: true });
        t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    for (const p of s.querySelectorAll('.spanel')) p.hidden = p.dataset.tab !== id;
    s.querySelector('.spanels').scrollTop = 0;
  }

  // the focusable control of each visible row, top to bottom
  const rowControls = () =>
    [...s.querySelectorAll('.spanel:not([hidden]) .srow')]
      .filter((r) => r.offsetParent !== null)
      .map((r) => r.querySelector('.seg [aria-checked=true]') || r.querySelector('.seg button, .sw, .keybind, input'));

  function nav(e) {
    if (listening) return;
    const a = document.activeElement;
    const tabs = [...s.querySelectorAll('[role=tab]')];
    const step = (d) => SECTIONS[(SECTIONS.findIndex((x) => x[0] === tab) + d + SECTIONS.length) % SECTIONS.length][0];
    const go = (f) => {
      f?.focus({ preventScroll: false });
      e.preventDefault();
    };
    if (e.key === 'PageDown' || e.key === 'PageUp')
      return (show(step(e.key === 'PageDown' ? 1 : -1), true), e.preventDefault());
    if (a?.getAttribute('role') === 'tab') {
      const vertical = !document.body.classList.contains('phone');
      const [prev, next, into] = vertical
        ? ['ArrowUp', 'ArrowDown', 'ArrowRight']
        : ['ArrowLeft', 'ArrowRight', 'ArrowDown'];
      if (e.key === prev || e.key === next) return (show(step(e.key === next ? 1 : -1), true), e.preventDefault());
      if (e.key === 'Home' || e.key === 'End')
        return (show((e.key === 'Home' ? tabs[0] : tabs.at(-1)).dataset.tab, true), e.preventDefault());
      if (e.key === into) return go(rowControls()[0]);
      return;
    }
    const row = a?.closest('.srow');
    if (!row) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const list = rowControls();
      const i = list.findIndex((c) => row.contains(c));
      const n = i + (e.key === 'ArrowDown' ? 1 : -1);
      return go(n < 0 ? s.querySelector('[role=tab][aria-selected=true]') : list[Math.min(n, list.length - 1)]);
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const right = e.key === 'ArrowRight';
    const g = a.closest('.seg');
    if (g) {
      const opts = [...g.children].map((b) => b.dataset.v);
      const i = opts.indexOf(String(settings[g.dataset.key]));
      const v = opts[(i + (right ? 1 : opts.length - 1)) % opts.length];
      choose(g.dataset.key, typeof settings[g.dataset.key] === 'number' ? +v : v);
      return go(g.querySelector(`[data-v="${v}"]`));
    }
    if (a.classList.contains('sw')) {
      if (!!settings[a.dataset.key] !== right) a.click();
      return e.preventDefault();
    }
    if (a.classList.contains('keybind') && !right && !document.body.classList.contains('phone'))
      return go(s.querySelector('[role=tab][aria-selected=true]'));
  }

  function stopListen(msg) {
    const kb = listening;
    listening = null;
    if (!kb) return;
    kb.classList.remove('listening');
    sync();
    help('keySay').textContent = msg || SAY_HELP;
  }
  // menu.js calls this first in its key handler: while the Say key field listens, the next key is the new Say key
  function captureKey(e) {
    if (!listening) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === 'Escape') stopListen();
    else if (RESERVED.test(e.code)) stopListen(`${keyLabel(e.code)} is already used by the game`);
    else {
      setSetting('keySay', e.code);
      sfx('ok');
      stopListen(`Say is now ${keyLabel(e.code)}`);
    }
    return true;
  }

  function sync() {
    if (!s) return;
    for (const g of s.querySelectorAll('.seg'))
      for (const b of g.children) {
        const on = String(settings[g.dataset.key]) === b.dataset.v;
        b.setAttribute('aria-checked', on);
        b.tabIndex = on ? 0 : -1;
      }
    for (const b of s.querySelectorAll('.sw')) b.setAttribute('aria-checked', !!settings[b.dataset.key]);
    for (const r of s.querySelectorAll('input[type=range]')) {
      const v = Math.round((settings[r.dataset.key] ?? 0) * 100);
      if (+r.value !== v) r.value = v;
      r.nextElementSibling.textContent = v;
      r.style.setProperty('--p', v + '%');
    }
    s.querySelector('[data-row=voice]').classList.toggle('off', !settings.voiceOn);
    const kb = s.querySelector('.keybind');
    if (!listening) kb.textContent = keyLabel(settings.keySay || 'KeyQ');
    const vn = help('voiceInput');
    if (!/Downloading/.test(vn.textContent)) vn.textContent = VOICE_NOTE[settings.voiceInput] || '';
    help('quality').textContent =
      settings.quality === 'auto' ? `Auto picks ${qualityTier()} on this device` : 'Changes at once';
  }
  onSettings(sync);

  function open() {
    if (!s) build();
    sync();
    for (const t of s.querySelectorAll('[role=tab]')) delete t.dataset.first;
    s.querySelector(`[role=tab][data-tab="${tab}"]`).dataset.first = '';
    openLayer(s, () => closeLayer(s));
  }
  return { open, captureKey };
}
