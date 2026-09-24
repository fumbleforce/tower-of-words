// Round 4: gpt-image-2, Grok Imagine, AnIllustrious v4 vs FLUX 2 Pro. Two portraits + one environment scene.
import { run, spent } from './rep.mjs';
const A = 'art/company/m4/';
const P = {
  mio: 'Anime character portrait, 2020s TV anime still, clean cel shading. Mio, 24, a low-effort gamer coworker: long unkempt black hair in a loose low ponytail, sleepy eyes, round wire glasses, baggy grey sweatshirt, holding a cup of instant noodles. Waist-up, plain light grey background. No text or logos.',
  rei: 'Anime character portrait, 2020s TV anime still, clean cel shading. Rei, 23, an ambitious saleswoman: long silver hair in a high ponytail, gold hoop earrings, white suit, holding a tablet, cool smile. Waist-up, plain light grey background. No text or logos.',
  scene: 'Anime still, 2020s TV anime. Hana, 25, a company reporter with two low braids, round glasses and a yellow raincoat, sneaking through a dark server room at a giant corporation, cold blue light from rows of monitors and cables, low camera angle from behind her shoulder as she looks back, detailed background. No text or logos.',
};
const T = {
  mio: '1girl, solo, black hair, long hair, messy hair, low ponytail, sleepy, round eyewear, grey sweatshirt, oversized clothes, holding cup ramen, upper body, looking at viewer, simple background, grey background, anime screencap',
  rei: '1girl, solo, grey hair, long hair, high ponytail, hoop earrings, white suit, holding tablet, smile, upper body, looking at viewer, simple background, grey background, anime screencap',
  scene: '1girl, solo, brown hair, twin braids, round eyewear, yellow raincoat, server room, dark, blue lighting, monitors, cables, from below, from behind, looking back, indoors, detailed background, anime screencap',
};
const M = {
  gpt: k => ['openai/gpt-image-2', { prompt: P[k], aspect_ratio: '3:4', quality: 'medium' }],
  grok: k => ['xai/grok-imagine-image', { prompt: P[k], aspect_ratio: '3:4' }],
  anill: k => ['aisha-ai-official/anillustrious-v4', { prompt: T[k], negative_prompt: 'nsfw, lowres, bad anatomy, bad hands, text, watermark, signature, worst quality, low quality', width: 896, height: 1152, steps: 28, scheduler: 'DPM++ 2M Karras', cfg_scale: 6 }],
};
const jobs = [];
for (const [m, mk] of Object.entries(M)) for (const k of Object.keys(P)) {
  const [model, input] = mk(k);
  jobs.push(run(model, input, `${A}${m}-${k}.png`).then(() => console.log('ok', m, k), e => console.log('FAIL', m, k, e.message.slice(0, 140))));
}
jobs.push(run('black-forest-labs/flux-2-pro', { prompt: P.scene, aspect_ratio: '3:4' }, `${A}flux-scene.png`).then(() => console.log('ok flux scene'), e => console.log('FAIL flux scene', e.message.slice(0, 140))));
await Promise.all(jobs);
console.log('spent', spent());
