// Comments on beats: Jørgen asks for an edit on a beat in the scene editor, Claude answers and marks it done.
// Jørgen, 2026-10-10: "I also want a comment button on the individual beats on the scenes, so I can ask you to edit them".
//
// Public scenes' comments sit with the editor's drafts (<state>/comments.json, state as in api.py); private scenes'
// under island/private/rewards/docs/scene-comments.json, so nothing private leaves island/private/.
// A comment keeps the scene id, the beat (a key from its content, which survives reorders, plus where it was and its
// words then), the request, the time, replies and whether it is done.
//
//   node tools/subplots/comments.mjs open              open comments: id, scene, beat, request, replies
//   node tools/subplots/comments.mjs all               every comment, done ones too
//   node tools/subplots/comments.mjs reply <id> "<text>"   answer as Claude (shows in the editor)
//   node tools/subplots/comments.mjs done <id> ["<text>"]  mark done, with an optional last reply
//   node tools/subplots/comments.mjs reopen <id>
// The editor's server calls it with --json and a request on stdin (api.py).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = () => path.resolve(process.env.SUBPLOTS_ROOT || path.join(HERE, '../..'));
function stateDir() {
  if (process.env.SUBPLOTS_STATE) return process.env.SUBPLOTS_STATE;
  const git = execFileSync('git', ['-C', root(), 'rev-parse', '--absolute-git-dir'], { encoding: 'utf8' }).trim();
  return path.join(git, 'subplot-editor');
}
export const isPrivate = id => !String(id).startsWith('public:');
const fileFor = priv => (priv ? path.join(root(), 'island/private/rewards/docs/scene-comments.json') : path.join(stateDir(), 'comments.json'));

function load(priv) {
  try { return JSON.parse(fs.readFileSync(fileFor(priv), 'utf8')); } catch { return { about: 'Scene editor comments (tools/subplots/comments.mjs).', comments: [] }; }
}
function store(priv, data) {
  const file = fileFor(priv);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  fs.renameSync(tmp, file);
}
const both = () => [...load(false).comments, ...load(true).comments];
function change(id, fn) {
  for (const priv of [false, true]) {
    const data = load(priv), c = data.comments.find(x => x.id === id);
    if (!c) continue;
    fn(c);
    store(priv, data);
    return c;
  }
  throw Error('No comment ' + id);
}

// The editor's requests.
export function run(req) {
  const now = new Date().toISOString();
  if (req.action === 'list') {
    const ids = new Set([].concat(req.ids || req.id || []));
    return { comments: both().filter(c => !ids.size || ids.has(c.scene)) };
  }
  if (req.action === 'add') {
    const text = String(req.text || '').trim();
    if (!req.id || !text) throw Error('A comment needs a scene and some words');
    const priv = isPrivate(req.id), data = load(priv);
    const c = {
      id: 'c' + now.replace(/\D/g, '').slice(2, 14) + '-' + crypto.randomBytes(2).toString('hex'),
      scene: req.id, title: String(req.title || ''), where: String(req.where || ''),
      beat: { key: String(req.beat?.key || ''), path: Array.isArray(req.beat?.path) ? req.beat.path : [], text: String(req.beat?.text || '').slice(0, 600), kind: String(req.beat?.kind || '') },
      text, by: 'jorgen', at: now, status: 'open', replies: [],
    };
    data.comments.push(c);
    store(priv, data);
    return { comment: c };
  }
  if (req.action === 'reply') {
    const text = String(req.text || '').trim();
    if (!text) throw Error('A reply needs some words');
    return { comment: change(req.comment, c => c.replies.push({ by: req.by === 'claude' ? 'claude' : 'jorgen', text, at: now })) };
  }
  if (req.action === 'done' || req.action === 'reopen') {
    return { comment: change(req.comment, c => { c.status = req.action === 'done' ? 'done' : 'open'; c.doneAt = req.action === 'done' ? now : undefined; }) };
  }
  throw Error('Unknown comment request');
}

// Open comments per scene, for the scene list's status.
export const openCounts = () => both().filter(c => c.status === 'open').reduce((m, c) => ((m[c.scene] = (m[c.scene] || 0) + 1), m), {});

function show(c) {
  const lines = [`${c.id}  [${c.status}${isPrivate(c.scene) ? ', private' : ''}]  ${c.title || c.scene}`, `  scene: ${c.scene}${c.where ? '  (' + c.where + ')' : ''}`,
    `  beat ${c.beat.path.join('.') || '?'}${c.beat.kind ? ' (' + c.beat.kind + ')' : ''}: ${c.beat.text.replace(/\s+/g, ' ').slice(0, 200)}`, `  request (${c.at.slice(0, 16).replace('T', ' ')}): ${c.text}`];
  for (const r of c.replies) lines.push(`  ${r.by === 'claude' ? 'Claude' : 'Jørgen'} (${r.at.slice(0, 16).replace('T', ' ')}): ${r.text}`);
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, id, ...rest] = process.argv.slice(2);
  try {
    if (cmd === '--json') {
      const chunks = [];
      for await (const c of process.stdin) chunks.push(c);
      console.log(JSON.stringify(run(JSON.parse(Buffer.concat(chunks)))));
    } else if (cmd === 'open' || cmd === 'all' || !cmd) {
      const list = both().filter(c => cmd === 'all' || c.status === 'open');
      console.log(list.length ? list.map(show).join('\n\n') : cmd === 'all' ? 'No comments.' : 'No open comments.');
    } else if (cmd === 'reply' && id && rest.length) {
      console.log(show(run({ action: 'reply', comment: id, text: rest.join(' '), by: 'claude' }).comment));
    } else if (cmd === 'done' && id) {
      if (rest.length) run({ action: 'reply', comment: id, text: rest.join(' '), by: 'claude' });
      console.log(show(run({ action: 'done', comment: id }).comment));
    } else if (cmd === 'reopen' && id) {
      console.log(show(run({ action: 'reopen', comment: id }).comment));
    } else {
      console.log('Usage: node tools/subplots/comments.mjs open | all | reply <id> "<text>" | done <id> ["<text>"] | reopen <id>');
      process.exitCode = 2;
    }
  } catch (e) {
    if (cmd === '--json') console.log(JSON.stringify({ error: e.message }));
    else console.error(e.message);
    process.exitCode = 1;
  }
}
