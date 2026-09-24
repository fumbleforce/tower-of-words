// Final cast candidates: FLUX 2 Pro, 2020s TV anime, short prompts, everyone clearly adult.
import { run, spent } from './rep.mjs';
const A = 'art/company/final/';
const STYLE = 'Anime character portrait, 2020s TV anime still, clean cel shading.';
const TAIL = 'Adult proportions and a mature face. Waist-up, plain light grey background. No text or logos.';
const C = {
  mio: 'Mio, a 25-year-old woman, a low-effort gamer coworker: long unkempt black hair in a loose low ponytail, sleepy eyes, thin wire glasses, baggy grey sweatshirt slipping off one shoulder, holding a cup of instant noodles.',
  sayaka: 'Sayaka, a 32-year-old woman, a cool team leader: short tousled ash-brown hair, dark turtleneck, thin silver necklace, amused half-smile.',
  hana: 'Hana, a 27-year-old woman, a sharp investigative reporter for the company paper: shoulder-length wavy chestnut hair, light freckles, fitted olive bomber jacket over a black top, a film camera on a strap, sly curious grin.',
  rei: 'Rei, a 26-year-old woman, an ambitious top saleswoman: long silver hair in a high ponytail, gold hoop earrings, tailored white suit, holding a tablet, cool confident smile.',
  aoi: 'Aoi, a 22-year-old woman, a graduate intern: shoulder-length pink-dyed hair with dark roots, oversized varsity jacket over a crop top, cheeky grin.',
  daigo: 'Daigo, a 29-year-old man, a stocky factory worker: shaved head, short beard, orange work jacket, laughing.',
  tomi: 'Tomi, a 58-year-old woman, a loud Osaka canteen auntie: permed grey hair, patterned bandana, leopard-print shirt under a white apron, laughing.',
  guard: 'A 55-year-old gate guard: grey crew cut, navy security cap and uniform, heavy-lidded stern stare, arms folded.',
};
const jobs = [];
for (const [k, d] of Object.entries(C)) for (const seed of [7, 21]) {
  jobs.push(run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d} ${TAIL}`, aspect_ratio: '3:4', safety_tolerance: 5, seed }, `${A}${k}-${seed}.webp`)
    .then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
