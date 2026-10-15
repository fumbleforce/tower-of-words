#!/usr/bin/env node
// One recipe path for every picture: renders a composition (the same JSON the scene editor's composer keeps) through
// the image gen queue. The prompt comes from assembleComposition in web/image-compose.js, the module the editor
// itself imports, and the job stores `compose` as the editor does, so opening the picture in the editor fills
// every block. There is no second prompt builder.
//
//   node tools/subplots/compose.mjs <recipe.json> [--count N] [--seed S] [--dry-run] [--wait] [--out DIR]
//        [--server URL] [--presets FILE] [--end-session]
//
// Agent recipes are validated by agent-recipe.mjs before queueing. Whole prompt, style/exclusion and people
// text overrides are refused. --presets is available only with --dry-run.
// Recipe fields are the composition's (web/image-compose.js DEFAULT_COMPOSITION): characters, outfit, cameras,
// framing, style, model, rating, hard, scene, pose, angle, environment, light, stage (who stands where, facing and
// looking at what: web/image-stage.js), extra (more prompt words),
// negatives (selected exclusion preset ids), reference/referenceOn/referenceStrength/referenceCutout (identity
// reference), faceFix/faceStrength, width, height, steps, cfg, count, seed. Also `subplotId` (the scene the
// picture belongs to, full scene editor id) together with `imageSlot` (the exact shot id) and `details` (free notes for what the blocks
// cannot say yet: img2img start, inpaint, hue fix, LoRA weights, ControlNet; stored and shown, never sent).
// --dry-run prints the assembled job and sends nothing. --wait waits for the pictures, saves each next to the
// recipe (or in --out) and prints the paths; --end-session then ends the image gen session so the GPU is freed,
// but only when nothing else is queued or running (other agents' jobs are never cancelled); it cancels only this
// run's own unfinished jobs. Against the local dashboard on a machine that has island/private/, the requests carry
// the same private cookie /private sets (private renders download, island/private start images are accepted).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareAgentGeneration} from './agent-recipe.mjs';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf('--' + name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
const count = flag('count'), seed = flag('seed'), dry = flag('dry-run'), wait = flag('wait'), endSession = flag('end-session');
const server = (flag('server') || process.env.IMAGEGEN_URL || 'http://127.0.0.1:8772').replace(/\/$/, '');
const presetsFile = flag('presets'); let outDir = flag('out');
const file = args[0];
if (!file) { console.error('usage: node tools/subplots/compose.mjs <recipe.json> [--count N] [--seed S] [--dry-run] [--wait] [--out DIR]'); process.exit(2); }

const recipe = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file).replace(/\.recipe\.json$|\.json$/, '');
// Local private access: the dashboard honours the cookie only for local requests with the private files present.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..').split(/[\\/]\.claude[\\/]worktrees[\\/]/)[0];
const localServer = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(server);
const privateHeaders = localServer && fs.existsSync(path.join(repoRoot, 'island', 'private', 'bible', 'nav.js')) && process.env.SUBPLOTS_PUBLIC_ONLY !== '1'
  ? {Cookie: 'amakawa_mode=private'} : {};
const getJson = async (url, init = {}) => {
  const r = await fetch(url, {...init, headers: {...privateHeaders, ...init.headers}});
  const t = await r.text();
  if (!r.ok) throw new Error(`${url}: ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t);
};
// A local preset file is a preview fixture, never an alternate source for a queued agent job.
if (presetsFile && !dry) throw new Error('--presets is supported only with --dry-run; queued jobs use the dashboard presets.');
const presets = presetsFile ? JSON.parse(fs.readFileSync(presetsFile, 'utf8')) : await getJson(server + '/api/presets');
if (count) recipe.count = +count;
if (seed != null) { recipe.seed = +seed; recipe.seedMode = 'fixed'; }
const body = prepareAgentGeneration(recipe, presets, name);
if (body.rating !== (recipe.rating || 'safe')) console.error(`Note: a character preset limits this picture to ${body.rating}.`);
if (dry) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }

const sent = await getJson(server + '/api/generate', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
console.log(`queued ${sent.run_id}: ${sent.jobs.map(j => j.id).join(' ')}`);
if (wait) {
  outDir ||= path.dirname(path.resolve(file));
  fs.mkdirSync(outDir, {recursive: true});
  const ids = new Set(sent.jobs.map(j => j.id));
  let done = [];
  for (;;) {
    await new Promise(r => setTimeout(r, 3000));
    const jobs = (await getJson(server + '/api/jobs')).filter(j => ids.has(j.id));
    if (jobs.length && jobs.every(j => ['done', 'error', 'cancelled'].includes(j.status))) { done = jobs; break; }
  }
  for (const j of done) {
    if (j.status !== 'done') { console.error(`${j.id}: ${j.status} ${j.error || ''}`); continue; }
    const out = path.join(outDir, `${name}-${j.id}-s${j.seed}.png`);
    const url = server + '/out/' + j.file.split('/').map(encodeURIComponent).join('/');
    const r = await fetch(url, {headers: privateHeaders});
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) { console.error(`${j.id}: could not download ${url}: ${r.status} ${type} ${(await r.text()).slice(0, 200)}`); process.exitCode = 1; continue; }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    console.log(`${j.id}\t${out}`);
  }
  if (endSession) {
    const post = (url, data) => getJson(server + url, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
    // cancel only this run's jobs (all finished by now, but an error exit may leave some), end the session only when idle
    await post('/api/cancel', {ids: [...ids]}).catch(e => console.error(e.message));
    const r = await post('/api/session/end', {if_idle: true}).catch(e => (console.error(e.message), {}));
    if (r.ended === false) console.log('Session left running: ' + r.reason);
  }
}
