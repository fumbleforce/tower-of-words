// MAPPA cast, round 4: wilder personalities, deliberately varied faces.
import { run, spent } from './rep.mjs';
const A = 'art/company/mappa/';
const STYLE = 'Anime character portrait, modern MAPPA anime still, sharp lines, cinematic lighting.';
const TAIL = 'Adult proportions. Close waist-up framing with the head in the upper third, filling the frame, plain light grey background. No text or logos.';
const C = {
  nanami2: 'Nanami, 29, a stoic company security officer. Round face with a strong brow, neat side-swept short black hair, navy company security uniform with a cap tucked under her arm, radio clipped to her chest, clipboard in hand, serious expression betrayed by a faint blush.',
  ren: 'Dr. Ren Kagami, 35, the manic genius who runs the robotics lab at the company university. Angular face, wild untamed dark curls held back with welding goggles, oil smudges on her cheek, stained lab coat, a sleek prosthetic arm she built herself, wide delighted grin showing teeth.',
  kiyoko: 'Kiyoko Madarame, 56, leader of one of the company\'s internal political factions. Long elegant face with high cheekbones, razor-sharp silver bob, dark red lipstick, black dress with a fur stole, a fan held closed in one hand, calculating half-lidded eyes and a faint smile.',
  oguri: 'Oguri, 33, an ex-boxer who runs the company gym. Broad square face, crooked broken nose, buzzed hair, tattooed forearms, a tank top under an open track jacket, knitting a pink scarf with gentle concentration, soft kind eyes.',
  luna: 'Luna, 27, the night-shift receptionist who knows everyone\'s secrets. Narrow face, sleek black hair in a high bun with chopsticks, heavy goth eyeliner, cat-eye glasses, company receptionist blazer, lazily painting her nails black, bored sly smirk.',
};
const jobs = [];
for (const [k, d] of Object.entries(C)) for (const seed of [3, 17]) {
  jobs.push(run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d} ${TAIL}`, aspect_ratio: '3:4', safety_tolerance: 5, seed }, `${A}${k}-${seed}.webp`)
    .then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
