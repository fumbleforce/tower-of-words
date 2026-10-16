#!/usr/bin/env node
// One recipe path for every picture: renders a composition (the same JSON the scene editor's composer keeps) through
// the image gen queue. The prompt comes from assembleComposition in web/image-compose.js, the module the editor
// itself imports, and the job stores `compose` as the editor does, so opening the picture in the editor fills
// every block. There is no second prompt builder.
//
//   node tools/subplots/compose.mjs <recipe.json> [--count N] [--seed S] [--dry-run] [--wait] [--out DIR] [--owner NAME]
//        [--server URL] [--presets FILE] [--end-session] [--reward]
//
// Agent recipes are validated by agent-recipe.mjs before queueing. Whole prompt, style/exclusion and people
// text overrides are refused. --presets is available only with --dry-run.
// Recipe fields are the composition's (web/image-compose.js DEFAULT_COMPOSITION): characters, outfit, cameras,
// framing, style, model, rating, hard, scene, pose, angle, environment, light, stage (who stands where, facing and
// looking at what: web/image-stage.js), extra (more prompt words),
// negatives (selected exclusion preset ids), reference/referenceOn/referenceStrength/referenceCutout (identity
// reference), faceFix/faceStrength, width, height, steps, cfg, count, seed, and the picture tools start ({image,
// denoise, mask}: img2img, or an inpaint with a mask), loras, control (an LLLite guide picture) and huefix. Also
// `subplotId` (the scene the picture belongs to, full scene editor id) together with `imageSlot` (the exact shot id)
// and `details` (free notes; stored and shown, never sent).
// --dry-run prints the assembled job and sends nothing. --wait waits for the pictures, saves each as webp in the
// round folder (or in --out) and prints the paths; --end-session then ends the image gen session so the GPU is freed,
// but only when nothing else is queued or running (other agents' jobs are never cancelled); it cancels only this
// run's own unfinished jobs. Against the local dashboard on a machine that has island/private/, the requests carry
// the same private cookie /private sets (private renders download, island/private start images are accepted).
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareAgentGeneration, prepareRewardGeneration, isRewardRecipePath} from './agent-recipe.mjs';
import {roundOf, repoRelative} from './compose-round.mjs';

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf('--' + name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
const reward = flag('reward');
const count = flag('count'), seed = flag('seed'), dry = flag('dry-run'), wait = flag('wait'), endSession = flag('end-session');
const server = (flag('server') || process.env.IMAGEGEN_URL || 'http://127.0.0.1:8772').replace(/\/$/, '');
const presetsFile = flag('presets'); let outDir = flag('out');
const ownerFlag = flag('owner');
if (ownerFlag === true) { console.error('--owner needs a name, for example --owner claude-main/imagegen-owner-round'); process.exit(2); }
// who made these renders: shown as Made by in the dashboard (IMAGEGEN_OWNER, else agent)
const owner = String(ownerFlag ?? process.env.IMAGEGEN_OWNER ?? '').trim() || 'agent';
const file = args[0];
if (!file) { console.error('usage: node tools/subplots/compose.mjs <recipe.json> [--count N] [--seed S] [--dry-run] [--wait] [--out DIR] [--owner NAME]'); process.exit(2); }

const recipe = JSON.parse(fs.readFileSync(file, 'utf8'));
const name = path.basename(file).replace(/\.recipe\.json$|\.json$/, '');
// Local private access: the dashboard honours the cookie only for local requests with the private files present.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..').split(/[\\/]\.claude[\\/]worktrees[\\/]/)[0];
const round = repoRelative(roundOf(file), repoRoot);
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
const rewardRecipe = reward || [path.resolve(file), fs.realpathSync(file)].some(isRewardRecipePath);
const body = (rewardRecipe ? prepareRewardGeneration : prepareAgentGeneration)(recipe, presets, name);
Object.assign(body, {owner, round});
if (body.rating !== (recipe.rating || 'safe')) console.error(`Note: a character preset limits this picture to ${body.rating}.`);
if (dry) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }

const sent = await getJson(server + '/api/generate', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
console.log(`queued ${sent.run_id}: ${sent.jobs.map(j => j.id).join(' ')}`);
// The round copy is webp, encoded by the image gen's own encoder (tools/imagegen/to_webp.py, Pillow). IMAGEGEN_PYTHON
// picks the interpreter. The master PNG on the dashboard is only read.
const toWebp = png => execFileSync(process.env.IMAGEGEN_PYTHON || 'python3', [path.join(here, '..', 'imagegen', 'to_webp.py')],
  {input: png, maxBuffer: 1 << 26});
if (wait) {
  outDir ||= roundOf(file);
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
    const out = path.join(outDir, `${name}-${j.id}-s${j.seed}.webp`);
    const url = server + '/out/' + j.file.split('/').map(encodeURIComponent).join('/');
    const r = await fetch(url, {headers: privateHeaders});
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) { console.error(`${j.id}: could not download ${url}: ${r.status} ${type} ${(await r.text()).slice(0, 200)}`); process.exitCode = 1; continue; }
    let webp;
    try { webp = toWebp(Buffer.from(await r.arrayBuffer())); }
    catch (e) { console.error(`${j.id}: could not make the webp copy: ${String(e.stderr || e.message).slice(0, 300)}`); process.exitCode = 1; continue; }
    fs.writeFileSync(out, webp);
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
