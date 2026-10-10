// Comments on beats (Jørgen, 2026-10-10: "a comment button on the individual beats on the scenes, so I can ask you to
// edit them"). A comment is kept by the server (tools/subplots/comments.mjs) with the beat's key, so it stays on its
// beat when beats move. Claude answers from the command line; replies show here.
const { document, setInterval } = globalThis;
import { esc, api } from './common.js';
import { S, docFor, docs } from './store.js';
import { beatKey, kindOf, KIND_LABEL, speakerOf, textsOf, describe } from './model.js';
import { personName, nodeTitle } from './names.js';
import { openPop, closePop } from './pop.js';

let byScene = new Map(), seen = '', onChange = () => {};

// The comments of the open scene and the parts its choices lead to.
export async function loadComments() {
  const ids = docs().map(d => d.scene.id);
  if (!ids.length) { byScene = new Map(); return; }
  const { comments } = await api('comments?ids=' + encodeURIComponent(ids.join(',')));
  const text = JSON.stringify(comments);
  if (text === seen) return;
  seen = text;
  byScene = new Map();
  for (const c of comments) {
    if (!byScene.has(c.scene)) byScene.set(c.scene, []);
    byScene.get(c.scene).push(c);
  }
  onChange();
}

const inner = path => (typeof path[0] === 'string' && path[0].startsWith('@') ? path.slice(1) : path);

// A beat's comments: by its key, or where it was when the key no longer matches anything (its words changed).
export function commentsFor(path, step) {
  const doc = docFor(path);
  const list = byScene.get(doc?.id) || [];
  if (!list.length) return [];
  const key = beatKey(step), at = inner(path).join('.');
  return list.filter(c => c.beat.key === key || (c.beat.path.join('.') === at && !keyStillThere(doc, c.beat.key)));
}
const keys = new WeakMap();
function keyStillThere(doc, key) {
  if (!keys.has(doc.steps)) {
    const all = new Set();
    const walk = xs => (xs || []).forEach(s => { all.add(beatKey(s)); if (s && typeof s === 'object') ['then', 'else', 'sequence'].forEach(k => walk(s[k])); });
    walk(doc.steps);
    keys.set(doc.steps, all);
  }
  return keys.get(doc.steps).has(key);
}

const beatWords = step => {
  const kind = kindOf(step), t = textsOf(step, S.scene?.recipe);
  if (kind === 'line') return `${personName(speakerOf(step))}: ${t.main}${t.second ? ' / ' + t.second : ''}`;
  if (kind === 'choice') return 'Choice: ' + step.choice.map(c => c.text).join(' / ');
  if (t.main) return t.main;
  return describe(step, personName, nodeTitle);
};

// The marker on a beat while a comment is open (a quiet one when all are done).
export function marker(path, step) {
  const list = commentsFor(path, step);
  if (!list.length) return null;
  const open = list.filter(c => c.status === 'open').length;
  const b = document.createElement('button');
  b.className = 'comment-mark' + (open ? ' open' : '');
  b.title = open ? `${open} open comment${open > 1 ? 's' : ''}` : 'Comments, done';
  b.textContent = open ? String(open) : '✓';
  b.onpointerdown = e => e.stopPropagation();
  b.onclick = e => { e.stopPropagation(); thread(b, path, step); };
  return b;
}

// The thread for a beat: its comments with replies, Done, and a box for a new request.
export function thread(anchor, path, step) {
  openPop(anchor, pop => {
    pop.classList.add('thread');
    const list = commentsFor(path, step);
    pop.innerHTML = `<div class="thread-beat"><span class="kind">${esc(KIND_LABEL[kindOf(step)])}</span> ${esc(beatWords(step).slice(0, 140))}</div>
      ${list.map(c => `<article class="comment ${c.status}" data-c="${esc(c.id)}">
        <p class="c-text">${esc(c.text)}</p><p class="c-meta">${esc(when(c.at))}${c.status === 'done' ? ' · Done' : ''}</p>
        ${c.replies.map(r => `<div class="reply ${r.by}"><span class="c-by">${r.by === 'claude' ? 'Claude' : 'You'}</span> ${esc(r.text)}</div>`).join('')}
        <div class="c-actions"><button class="link" data-reply>Reply</button><button class="link" data-done>${c.status === 'done' ? 'Open again' : 'Mark done'}</button></div>
      </article>`).join('')}
      <label class="c-new"><span>${list.length ? 'Another request for this beat' : 'Ask for a change to this beat'}</span><textarea rows="3" placeholder="What should change? Claude reads these and answers here."></textarea></label>
      <div class="c-send"><button class="primary" data-send>Send</button></div>`;
    const box = pop.querySelector('textarea');
    pop.querySelector('[data-send]').onclick = async () => {
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      const doc = docFor(path);
      await api('comment', { action: 'add', id: doc.id, title: doc.title || '', where: doc.where || '', text, beat: { key: beatKey(step), path: inner(path), text: beatWords(step), kind: KIND_LABEL[kindOf(step)] } });
      closePop();
      await loadComments();
    };
    box.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) pop.querySelector('[data-send]').click(); };
    pop.querySelectorAll('[data-c]').forEach(el => {
      const id = el.dataset.c, c = list.find(x => x.id === id);
      el.querySelector('[data-done]').onclick = async () => { await api('comment', { action: c.status === 'done' ? 'reopen' : 'done', comment: id }); closePop(); await loadComments(); };
      el.querySelector('[data-reply]').onclick = () => {
        const t = document.createElement('textarea');
        t.rows = 2;
        t.placeholder = 'Your reply';
        const send = document.createElement('button');
        send.textContent = 'Send reply';
        send.onclick = async () => { if (!t.value.trim()) return; await api('comment', { action: 'reply', comment: id, text: t.value.trim() }); closePop(); await loadComments(); };
        el.querySelector('.c-actions').replaceWith(t, send);
        t.focus();
      };
    });
    if (!list.length) box.focus();
  });
}

const when = at => new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Open comments in the whole scene, for the top bar.
export const openCount = () => [...byScene.values()].flat().filter(c => c.status === 'open').length;

export function installComments(changed) {
  onChange = changed;
  // replies written from the command line show up without a reload
  setInterval(() => { if (!document.hidden && S.scene) loadComments().catch(() => {}); }, 20000);
}
