import { WORDS, known, nameAt } from '../lang.js';

// Test mode: record what an overheard line rendered, so the fast test fails on a known word or a name shown garbled.
export function recordHeard(text, voiceKey) {
  const line = document.querySelector('#talk .line');
  const garbled = [...line.querySelectorAll('.gx')].map((e) => e.dataset.c).join('');
  const bad = [...known].filter((id) => {
    const w = WORDS[id];
    return w && [w.ja, ...(w.alias || [])].some((ja) => garbled.includes(ja));
  });
  (window.__test.heard ||= []).push({
    key: voiceKey,
    text,
    known: [...known],
    tokens: [...line.children].map((e) => `${e.className}:${e.textContent}`),
    garbledKnown: bad,
  });
  if (bad.length) window.__test.errors.push(`known word shown garbled in "${text}": ${bad.join(', ')}`);
  // names are never garbled (lang.js NAMES): every name in the line is on screen as a name
  const plain = text.replace(/\{(\w+)\}/g, (_, id) => WORDS[id]?.ja || id);
  const names = [...plain].map((_, i) => nameAt(plain, i)?.ja).filter(Boolean);
  const shown = [...line.querySelectorAll('.name')].map((e) => e.textContent);
  const hidden = names.filter((n) => !shown.includes(n));
  if (hidden.length) window.__test.errors.push(`name shown garbled in "${text}": ${hidden.join(', ')}`);
}
