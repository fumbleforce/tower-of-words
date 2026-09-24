// Reward-scene test: can the model do light fan service without refusing? Adults only, suggestive not explicit.
import { run, spent } from './rep.mjs';
const A = 'art/company/m5/';
const P = {
  pool: 'Anime still, 2020s TV anime. Rei, a 23-year-old saleswoman with long silver hair in a high ponytail and gold hoop earrings, at her company\'s rooftop summer party, wearing a white swimsuit with a sheer wrap, sitting on the edge of the pool with her legs in the water, confident teasing smile at the viewer, warm evening light, city skyline behind.',
  dorm: 'Anime still, 2020s TV anime. Mio, a 24-year-old office worker with messy black hair in a loose ponytail and round glasses, sprawled on her dorm bed late at night in an oversized t-shirt and shorts, playing a handheld game console, glow from the screen on her face, relaxed and a little embarrassed to be seen.',
};
const T = {
  pool: '1girl, solo, adult, mature female, grey hair, long hair, high ponytail, hoop earrings, white one-piece swimsuit, sheer wrap, sitting, poolside, feet in water, rooftop, city skyline, evening, smile, looking at viewer, anime screencap',
  dorm: '1girl, solo, adult, black hair, messy hair, low ponytail, round eyewear, oversized t-shirt, shorts, lying on bed, on stomach, holding handheld game console, night, screen light, bedroom, embarrassed, anime screencap',
};
const jobs = [];
for (const k of Object.keys(P)) {
  jobs.push(run('black-forest-labs/flux-2-pro', { prompt: P[k], aspect_ratio: '3:4', safety_tolerance: 5 }, `${A}flux-${k}.png`).then(() => console.log('ok flux', k), e => console.log('FAIL flux', k, e.message.slice(0, 120))));
  jobs.push(run('xai/grok-imagine-image', { prompt: P[k], aspect_ratio: '3:4' }, `${A}grok-${k}.png`).then(() => console.log('ok grok', k), e => console.log('FAIL grok', k, e.message.slice(0, 120))));
  jobs.push(run('aisha-ai-official/anillustrious-v4', { prompt: T[k], negative_prompt: 'nsfw, nude, lowres, bad anatomy, bad hands, text, watermark, worst quality, low quality, child', width: 896, height: 1152, steps: 28, scheduler: 'DPM++ 2M Karras', cfg_scale: 6 }, `${A}anill-${k}.png`).then(() => console.log('ok anill', k), e => console.log('FAIL anill', k, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
