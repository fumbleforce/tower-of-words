// Round 2: five models, four anime styles, eight characters (two per style). Short prompts.
import { run, spent } from './rep.mjs';
const A = 'art/company/m2/';
const C = {
  mio: 'Mio, 24, a sardonic office worker who games all night: messy black bob with teal underneath, tired eyes, oversized black hoodie, headset around her neck.',
  daigo: 'Daigo, 28, a factory-floor worker of average build: bleached buzzcut, grey t-shirt, work coveralls tied at the waist, hard hat under one arm, friendly grin.',
  reiB: 'Rei, 23, an ambitious saleswoman: sharp black bob with one silver streak, red lipstick, black suit, arms crossed, confident smirk.',
  guard: 'A gate guard in his fifties: grey crew cut, navy security cap and uniform, heavy-lidded stern stare, arms folded.',
  sayaka: 'Sayaka, 32, a relaxed team leader: wavy brown hair in a claw clip, red glasses, white shirt with rolled sleeves, easy smile.',
  tomi: 'Tomi, 58, a loud Osaka canteen auntie: permed grey hair, patterned bandana, leopard-print shirt under a white apron, laughing.',
  hana: 'Hana, 25, a company newspaper reporter: short permed chestnut hair with hairpins, freckles, olive bomber jacket, film camera in hand, bright grin.',
  rei: 'Rei, 23, an ambitious saleswoman: long silver hair in a high ponytail, gold hoop earrings, white suit, holding a tablet, cool smile.',
};
const S = {
  tv: ['2020s TV anime still, clean cel shading.', ['mio', 'daigo']],
  seinen: ['Mature seinen anime, like Psycho-Pass.', ['reiB', 'guard']],
  cel90s: ['1990s anime cel, like Cowboy Bebop.', ['sayaka', 'tomi']],
  vn: ['Visual novel character sprite art.', ['hana', 'rei']],
};
const tail = 'Waist-up, plain light grey background. No text or logos.';
const M = {
  seedream: p => ['bytedance/seedream-4.5', { prompt: p, aspect_ratio: '3:4', size: '2K' }],
  flux: p => ['black-forest-labs/flux-2-pro', { prompt: p, aspect_ratio: '3:4' }],
  imagen: p => ['google/imagen-4', { prompt: p, aspect_ratio: '3:4' }],
  hunyuan: p => ['tencent/hunyuan-image-3', { prompt: p, aspect_ratio: '3:4' }],
  minimax: p => ['minimax/image-01', { prompt: p, aspect_ratio: '3:4' }],
};
const jobs = [];
for (const [m, mk] of Object.entries(M)) for (const [s, [style, chars]] of Object.entries(S)) for (const c of chars) {
  const [model, input] = mk(`Anime character portrait, ${style} ${C[c]} ${tail}`);
  jobs.push(run(model, input, `${A}${m}-${s}-${c}.png`).then(() => console.log('ok', m, s, c), e => console.log('FAIL', m, s, c, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
