// Cast in modern MAPPA anime style, personality-first descriptions (modelled on Rei v2). FLUX 2 Pro, tolerance 5.
import { run, spent } from './rep.mjs';
const A = 'art/company/mappa/';
const STYLE = 'Anime character portrait, modern MAPPA anime still, sharp lines, cinematic lighting.';
const TAIL = 'Adult proportions and a mature face. Waist-up, plain light grey background. No text or logos.';
const C = {
  rei: ['art/company/v2/rei.webp', 'The same woman as in image 1, redrawn in this style: Rei, 26, a fiercely ambitious top salesperson. Long silver-grey hair in a sleek high ponytail, sharp eyeliner, thin gold hoops, tailored white suit over a black shirt, gold award pin on the lapel, tablet against her hip, a cool challenging stare with a slight smile.'],
  mio: [null, 'Mio, 25, a shut-in gamer who somehow works here. Messy black hair with teal underneath in a loose knot, half-lidded unimpressed eyes behind thin glasses, oversized black hoodie slipping off one shoulder, headset around her neck, energy drink in hand, a deadpan stare that dares you to talk to her.'],
  sayaka: [null, 'Sayaka, 32, the team leader who never seems to work and is always right. Wavy dark-brown hair in a claw clip, red-framed glasses, white shirt with rolled sleeves, leaning back with arms crossed, a lazy knowing smirk.'],
  hana: [null, 'Hana, 27, a nosy investigative reporter for the company paper. Shoulder-length wavy chestnut hair, light freckles, olive bomber jacket covered in enamel pins, film camera raised, one eye narrowed, a grin like she just caught you at something.'],
  aoi: [null, 'Aoi, 22, a chaotic graduate intern. Pink-dyed shoulder-length hair with dark roots, varsity jacket over a crop top, lollipop in hand, a cheeky wink.'],
  daigo: [null, 'Daigo, 29, an easygoing factory worker of average build. Bleached buzzcut, light stubble, grey t-shirt, work coveralls tied at the waist, hard hat under one arm, mid-laugh.'],
  tomi: [null, 'Tomi, 58, the loud Osaka canteen auntie. Curly permed grey hair under a bright bandana, big round earrings, leopard-print shirt under a white apron, pointing a ladle at you, laughing.'],
  guard: [null, 'The gate guard, 55. Grey crew cut under a navy security cap, heavy-lidded eyes, deep lines around the mouth, navy uniform with a shoulder radio, arms folded, utterly unimpressed.'],
};
const jobs = [];
for (const [k, [ref, d]] of Object.entries(C)) for (const seed of [3, 17]) {
  const input = { prompt: `${STYLE} ${d} ${TAIL}`, aspect_ratio: '3:4', safety_tolerance: 5, seed };
  if (ref) input.input_images = [ref];
  jobs.push(run('black-forest-labs/flux-2-pro', input, `${A}${k}-${seed}.webp`).then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
