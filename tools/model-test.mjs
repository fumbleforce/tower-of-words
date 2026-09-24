// Model x style comparison: two characters, two anime styles, six models.
import { run, spent } from './rep.mjs';
const A = 'art/company/models/';
const CHARS = {
  mio: { desc: 'Mio, a 24-year-old Japanese office worker who lives like a shut-in gamer: messy chin-length black hair with teal dyed underneath, tired half-lidded eyes with faint dark circles, oversized black hoodie with the hood half up, gaming headset around her neck, holding an energy drink can, company ID card on a lanyard, bored deadpan expression.',
    tags: '1girl, solo, black hair, teal inner hair color, short hair, messy hair, tired eyes, half-closed eyes, dark circles, black hoodie, hood up, oversized clothes, headphones around neck, holding can, energy drink, lanyard, id card, expressionless' },
  rei: { desc: 'Rei, a 23-year-old Japanese top salesperson, sharp and ambitious: long silver-grey hair in a sleek high ponytail, thin gold hoop earrings, tailored white suit jacket over a black shirt, small gold pin on the lapel, holding a tablet, confident challenging look with a slight smile.',
    tags: '1girl, solo, grey hair, long hair, high ponytail, hoop earrings, white suit, black shirt, lapel pin, holding tablet, confident, smirk, office lady' },
};
const STYLES = {
  tv: { text: 'Modern Japanese TV anime style, like a 2020s anime production still: clean crisp line art, cel shading with two tones, natural colours, expressive but grounded face.', tags: 'anime screencap, anime coloring, cel shading, clean lineart' },
  seinen: { text: 'Mature seinen anime style in the vein of Psycho-Pass and Ghost in the Shell Stand Alone Complex: sharp adult facial features, restrained cool palette, precise line art, cinematic shading.', tags: '1990s (style), 2000s (style), mature female, sharp features, cinematic lighting' },
};
const FRAME = 'Waist-up character portrait facing the viewer at a slight angle, plain light grey background, soft even studio lighting.';
const MODELS = {
  nanobanana: (p) => ['google/nano-banana-pro', { prompt: p, aspect_ratio: '3:4', resolution: '1K' }],
  seedream: (p) => ['bytedance/seedream-4.5', { prompt: p, aspect_ratio: '3:4', size: '2K' }],
  qwen: (p) => ['qwen/qwen-image', { prompt: p, aspect_ratio: '3:4' }],
  ideogram: (p) => ['ideogram-ai/ideogram-v3-turbo', { prompt: p, aspect_ratio: '3:4', style_type: 'General' }],
  flux: (p) => ['black-forest-labs/flux-2-pro', { prompt: p, aspect_ratio: '3:4' }],
  animagine: (p, t) => ['aisha-ai-official/animagine-xl-4.0', { prompt: t, negative_prompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry', width: 896, height: 1152 }],
};
const jobs = [];
for (const [m, mk] of Object.entries(MODELS)) for (const [s, st] of Object.entries(STYLES)) for (const [c, ch] of Object.entries(CHARS)) {
  const prompt = `${ch.desc} ${st.text} ${FRAME}`;
  const tags = `${ch.tags}, upper body, looking at viewer, simple background, grey background, ${st.tags}, masterpiece, high score, great score, absurdres`;
  const [model, input] = mk(prompt, tags);
  jobs.push(run(model, input, `${A}${m}-${s}-${c}.png`).then(() => console.log('ok', m, s, c), e => console.log('FAIL', m, s, c, e.message.slice(0, 110))));
}
await Promise.all(jobs);
console.log('spent', spent());
