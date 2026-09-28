// Shared data for the dialogue mockups. ?s=1|2|3 picks the moment in a short exchange at the security desk:
// 1 the guard (stern) says the card isn't registered yet, 2 Eric (surprised) answers, 3 the guard (amused) softens.
// ?still freezes all motion (used for the PNG renders).
const P = '../assets/portraits/';
const GX = (s) => [...s].map((c) => (/[。、！？]/.test(c) ? c : `<span class="gx">${'あかさたなはまやらわ'[c.charCodeAt(0) % 10]}</span>`)).join('');
const STATES = {
  1: {
    who: 'guard', name: 'Mr. Ishibashi', role: 'security', heard: true, face: 'stern',
    line: `${GX('新しいカードですね')}。${GX('登録は')}<span class="jp">九時</span> <span class="gl">(kuji, nine o'clock)</span>${GX('からです')}。`,
  },
  2: { who: 'eric', name: 'Eric', role: 'you', face: 'surprised', line: 'Nine? It\'s barely half eight.' },
  3: {
    who: 'guard', name: 'Mr. Ishibashi', role: 'security', heard: true, face: 'amused',
    line: `${GX('ははっ')}。<span class="jp">がんばって</span> <span class="gl">(ganbatte, hang in there)</span>。`,
  },
};
const Q = new URLSearchParams(location.search);
const s = STATES[Q.get('s') || '1'];
const doc = document.documentElement;
doc.dataset.who = s.who;
if (Q.has('still')) doc.classList.add('still');
if (s.heard) doc.classList.add('heard');
const guardFace = s.who === 'guard' ? s.face : 'stern';
const ericFace = s.who === 'eric' ? s.face : 'neutral';
const set = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
set('[data-f="name"]', (e) => { e.textContent = s.name; });
set('[data-f="role"]', (e) => { e.textContent = s.role + (s.heard ? ' · in Japanese' : ''); });
set('[data-f="line"]', (e) => { e.innerHTML = s.line; });
set('[data-p="guard"]', (e) => { e.style.setProperty('--src', `url("${P}guard-${guardFace}.webp")`); if (e.tagName === 'IMG') e.src = `${P}guard-${guardFace}.webp`; });
set('[data-p="eric"]', (e) => { e.style.setProperty('--src', `url("${P}eric-${ericFace}.webp")`); if (e.tagName === 'IMG') e.src = `${P}eric-${ericFace}.webp`; });
set('[data-p="speaker"]', (e) => { const src = `${P}${s.who}-${s.face}.webp`; e.style.setProperty('--src', `url("${src}")`); if (e.tagName === 'IMG') e.src = src; });
doc.dataset.face = s.face;
