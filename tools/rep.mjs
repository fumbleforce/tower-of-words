// Replicate runner with a spend ledger and a hard budget cap.
// CLI:    node tools/rep.mjs <owner/model> <out-file> '<json input>'
// Module: import { run } from './rep.mjs'; await run(model, input, outFile)
// Local file paths in input_image / input_images / image / start_image are sent as data URIs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'tools', 'spend.json');
const BUDGET = 100; // USD, agreed with Jørgen

// Rough per-call USD estimates (Replicate doesn't return cost per prediction).
const PRICE = {
  'black-forest-labs/flux-2-pro': i => 0.03 + 0.015 * ((i.input_images || []).length + (i.resolution === '2 MP' ? 1 : 0)),
  'black-forest-labs/flux-2-dev': () => 0.015,
  'black-forest-labs/flux-kontext-pro': () => 0.04,
  'google/nano-banana': () => 0.039,
  'google/nano-banana-pro': () => 0.15,
  'retro-diffusion/rd-plus': i => 0.05 * (i.num_images || 1),
  'retro-diffusion/rd-tile': i => 0.05 * (i.num_images || 1),
  'retro-diffusion/rd-animation': () => 0.1,
  'kwaivgi/kling-v2.1': i => (i.duration === 10 ? 0.5 : 0.25) * (i.mode === 'pro' ? 1.8 : 1),
  'google/veo-3-fast': () => 1.2,
  'bytedance/seedance-1-pro': () => 0.6,
  'google/lyria-2': () => 0.12,
  'meta/musicgen': () => 0.1,
  '851-labs/background-remover': () => 0.002,
  'minimax/speech-2.6-hd': i => Math.max(0.002, (i.text || '').length * 0.0001),
  'minimax/speech-2.6-turbo': i => Math.max(0.001, (i.text || '').length * 0.00006),
};

function env() {
  if (process.env.REPLICATE_API_KEY) return process.env.REPLICATE_API_KEY;
  const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').find(l => l.startsWith('REPLICATE_API_KEY='));
  return line.slice('REPLICATE_API_KEY='.length).trim();
}
const ledger = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { total: 0, calls: [] });
export const spent = () => ledger().total;

function toDataUri(p) {
  if (typeof p !== 'string' || /^(https?:|data:)/.test(p) || !fs.existsSync(p)) return p;
  const ext = path.extname(p).slice(1).replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(p).toString('base64')}`;
}

export async function run(model, input, outFile, { force = false } = {}) {
  if (!force && outFile && fs.existsSync(outFile)) return outFile; // cached: never pay twice
  const est = (PRICE[model] || (() => 0.1))(input);
  const L = ledger();
  if (L.total + est > BUDGET) throw new Error(`Budget cap: $${L.total.toFixed(2)} spent, this call ~$${est} would exceed $${BUDGET}`);
  const body = { ...input };
  for (const k of ['input_image', 'image', 'start_image', 'extra_input_image', 'input_palette']) if (body[k]) body[k] = toDataUri(body[k]);
  if (body.input_images) body.input_images = body.input_images.map(toDataUri);

  const headers = { Authorization: `Bearer ${env()}`, 'Content-Type': 'application/json', Prefer: 'wait=60' };
  let res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, { method: 'POST', headers, body: JSON.stringify({ input: body }) });
  if (res.status === 404) {
    // Community models have to be run by version id.
    const version = (await (await fetch(`https://api.replicate.com/v1/models/${model}`, { headers })).json()).latest_version.id;
    res = await fetch('https://api.replicate.com/v1/predictions', { method: 'POST', headers, body: JSON.stringify({ version, input: body }) });
  }
  let pred = await res.json();
  if (!res.ok) throw new Error(`${model}: ${res.status} ${JSON.stringify(pred).slice(0, 300)}`);
  while (['starting', 'processing'].includes(pred.status)) {
    await new Promise(r => setTimeout(r, 2500));
    pred = await (await fetch(pred.urls.get, { headers })).json();
  }
  if (pred.status !== 'succeeded') throw new Error(`${model}: ${pred.status} ${pred.error || ''}`);

  const L2 = ledger(); // re-read: parallel calls append too
  L2.total = +(L2.total + est).toFixed(4);
  L2.calls.push({ t: new Date().toISOString(), model, est, out: outFile && path.relative(ROOT, outFile), prompt: (input.prompt || '').slice(0, 120) });
  fs.writeFileSync(LEDGER, JSON.stringify(L2, null, 1));

  const urls = [].concat(pred.output).filter(Boolean);
  if (!outFile) return urls;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const saved = [];
  for (const [n, u] of urls.entries()) {
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    const ext = path.extname(new URL(u).pathname) || path.extname(outFile);
    const base = outFile.replace(/\.[^.]+$/, '');
    const file = urls.length === 1 ? base + ext : `${base}-${n + 1}${ext}`;
    fs.writeFileSync(file, buf);
    saved.push(file);
  }
  return saved.length === 1 ? saved[0] : saved;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [model, out, json] = process.argv.slice(2);
  run(model, JSON.parse(json), out, { force: true }).then(f => console.log(f, `· total ~$${spent().toFixed(2)}`), e => { console.error(e.message); process.exit(1); });
}
