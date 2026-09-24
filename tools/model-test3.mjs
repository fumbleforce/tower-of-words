// Round 3: FLUX family + HiDream + Lucid Origin; three TV-anime-family styles; new character looks.
import { run, spent } from './rep.mjs';
const A = 'art/company/m3/';
const C = {
  mio: 'Mio, 24, a low-effort gamer coworker: long unkempt black hair in a loose low ponytail, sleepy eyes, round wire glasses, baggy grey sweatshirt, holding a cup of instant noodles.',
  daigo: 'Daigo, 28, a stocky factory worker: shaved head, short beard, orange work jacket, laughing.',
  sayaka: 'Sayaka, 32, a cool team leader: short tousled ash-brown hair, dark turtleneck, thin silver necklace, amused half-smile.',
  hana: 'Hana, 25, a company newspaper reporter: two low braids, big round glasses, yellow raincoat, notepad and pen, excited.',
  rei: 'Rei, 23, an ambitious saleswoman: long silver hair in a high ponytail, gold hoop earrings, white suit, holding a tablet, cool smile.',
  aoi: 'Aoi, 20, an intern from the company university: shoulder-length pink-dyed hair with dark roots, oversized varsity jacket, a lollipop, cheeky grin.',
};
const S = {
  tv: ['2020s TV anime still, clean cel shading.', ['mio', 'daigo']],
  josei: ['Josei anime style, soft muted colors, like Nana or Honey and Clover.', ['sayaka', 'hana']],
  mappa: ['Modern MAPPA anime still, sharp lines, cinematic lighting.', ['rei', 'aoi']],
};
const tail = 'Waist-up, plain light grey background. No text or logos.';
const M = {
  flux: p => ['black-forest-labs/flux-2-pro', { prompt: p, aspect_ratio: '3:4' }],
  fluxmax: p => ['black-forest-labs/flux-2-max', { prompt: p, aspect_ratio: '3:4' }],
  fluxflex: p => ['black-forest-labs/flux-2-flex', { prompt: p, aspect_ratio: '3:4' }],
  hidream: p => ['prunaai/hidream-l1-fast', { prompt: p, resolution: '880 × 1168 (Portrait)', speed_mode: 'Unsqueezed 🍋 (highest quality)' }],
  lucid: p => ['leonardoai/lucid-origin', { prompt: p, aspect_ratio: '3:4', style: 'none' }],
};
const jobs = [];
for (const [m, mk] of Object.entries(M)) for (const [s, [style, chars]] of Object.entries(S)) for (const c of chars) {
  const [model, input] = mk(`Anime character portrait, ${style} ${C[c]} ${tail}`);
  jobs.push(run(model, input, `${A}${m}-${s}-${c}.png`).then(() => console.log('ok', m, s, c), e => console.log('FAIL', m, s, c, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
