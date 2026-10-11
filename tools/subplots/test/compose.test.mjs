import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// compose.mjs against a stub dashboard: the private cookie, a failed download that must fail loudly, and
// --end-session that cancels only this run's jobs and leaves the session alone while other jobs are busy.
const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '..', 'compose.mjs');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const rec = (id, data) => ({id, v: 1, data});
const presets = {
  character: [rec('alice', {name: 'Alice', age: 'adult woman', look: 'black hair', gender: 'female'})],
  style: [rec('soft', {name: 'Soft', quality: 'high quality'})],
  model: [rec('model', {name: 'Model', file: 'fixture.safetensors', steps: 5, cfg: 4, sampler: 'euler', scheduler: 'normal'})],
  framing: [rec('wide', {prompt: 'wide shot', w: 64, h: 64})],
  camera: [], negative: [rec('clean', {name: 'Clean', default: true, text: 'blur'})], scene: [],
};

function stub({busy = false, out404 = false} = {}) {
  const seen = {cookies: [], posts: []};
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      seen.cookies.push(req.headers.cookie || '');
      const json = (code, o) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(o)); };
      if (req.method === 'POST') seen.posts.push([req.url, body ? JSON.parse(body) : {}]);
      if (req.url === '/api/generate') return json(200, {run_id: 'r1', jobs: [{id: 'mine'}]});
      if (req.url === '/api/jobs') return json(200, [{id: 'mine', status: 'done', file: '2026/a.png', seed: 3}, ...(busy ? [{id: 'other', status: 'queued'}] : [])]);
      if (req.url === '/api/cancel') return json(200, {ok: true});
      if (req.url === '/api/session/end') return json(200, JSON.parse(body).if_idle && busy ? {ok: true, ended: false, reason: 'other jobs are still queued or running'} : {ok: true});
      if (req.url.startsWith('/out/')) {
        if (out404) return json(404, {error: 'not found'});
        res.writeHead(200, {'content-type': 'image/png'}); return res.end(PNG);
      }
      json(404, {error: 'no'});
    });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({srv, seen, url: `http://127.0.0.1:${srv.address().port}`})));
}

async function run(opts, extra = [], env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compose-test-'));
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify(presets));
  fs.writeFileSync(path.join(dir, 'pic.recipe.json'), JSON.stringify({characters: ['alice'], model: 'model', style: 'soft', framing: 'wide'}));
  const {srv, seen, url} = await stub(opts);
  const child = spawn('node', [script, path.join(dir, 'pic.recipe.json'), '--presets', path.join(dir, 'p.json'), '--server', url, '--wait', ...extra],
    {env: {...process.env, ...env}});
  let stdout = '', stderr = '';
  child.stdout.on('data', d => stdout += d); child.stderr.on('data', d => stderr += d);
  const code = await new Promise(ok => child.on('close', ok));
  srv.close();
  return {dir, seen, stdout, stderr, code};
}

const hasPrivate = fs.existsSync(path.join(here, '..', '..', '..', 'island', 'private', 'bible', 'nav.js'))
  || fs.existsSync('/home/jorgen/repo/japanese/island/private/bible/nav.js');

test('saves the picture, and sends the private cookie only when private files are here', {timeout: 30000}, async () => {
  const r = await run();
  assert.equal(r.code, 0, r.stderr);
  const saved = fs.readdirSync(r.dir).filter(f => f.endsWith('.png'));
  assert.equal(saved.length, 1);
  assert.deepEqual(fs.readFileSync(path.join(r.dir, saved[0])), PNG);
  assert.ok(r.seen.cookies.every(c => hasPrivate ? c === 'amakawa_mode=private' : c === ''), JSON.stringify(r.seen.cookies));
  const pub = await run({}, [], {SUBPLOTS_PUBLIC_ONLY: '1'});
  assert.ok(pub.seen.cookies.every(c => c === ''));
});

test('a failed download is an error, never a JSON file named like a picture', {timeout: 30000}, async () => {
  const r = await run({out404: true});
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /could not download/);
  assert.deepEqual(fs.readdirSync(r.dir).filter(f => f.endsWith('.png')), []);
});

test('--end-session cancels only its own jobs and leaves a busy session running', {timeout: 30000}, async () => {
  const busy = await run({busy: true}, ['--end-session']);
  assert.equal(busy.code, 0, busy.stderr);
  assert.deepEqual(busy.seen.posts.find(p => p[0] === '/api/cancel')[1], {ids: ['mine']});
  assert.deepEqual(busy.seen.posts.find(p => p[0] === '/api/session/end')[1], {if_idle: true});
  assert.match(busy.stdout, /Session left running/);
  const idle = await run({busy: false}, ['--end-session']);
  assert.doesNotMatch(idle.stdout, /Session left running/);
});
