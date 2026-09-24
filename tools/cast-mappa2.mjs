// MAPPA cast, round 2 of revisions. Same style and tail as cast-mappa.mjs; closer framing.
import { run, spent } from './rep.mjs';
const A = 'art/company/mappa/';
const STYLE = 'Anime character portrait, modern MAPPA anime still, sharp lines, cinematic lighting.';
const TAIL = 'Adult proportions and a mature face. Close waist-up framing with the head in the upper third, filling the frame, plain light grey background. No text or logos.';
const C = {
  rei2: ['art/company/v2/rei.webp', 'The same woman as in image 1, redrawn in this style: Rei, 26, the sharp, immaculate, authoritarian top salesperson with a hint of the predator. Silver-grey hair in a sleek high ponytail, sharp eyeliner, thin gold hoops, perfectly tailored white suit over a black shirt, gold award pin, chin raised and looking down at the viewer, a thin knowing smile, tapping a silver pen against her lips.'],
  hana2: [null, 'Hana, 27, a nosy investigative reporter for the company paper. Short black pixie cut with a longer fringe, narrow sharp eyes, a beauty mark under her left eye, silver ear cuff, olive bomber jacket with a few pins, film camera raised, a sly grin like she just caught you.'],
  guard2: [null, 'The gate guard, a wiry man in his sixties. Neat grey pencil moustache, bushy eyebrows, reading glasses on a chain, navy security cap and uniform, a folded newspaper under his arm, squinting suspiciously over his glasses.'],
  kaori: [null, 'Kaori, 44, the calm head chef of the company canteen. Tall, short grey-streaked hair, chef whites with rolled sleeves showing a faded tattoo on her forearm, a towel over her shoulder, holding a steaming bowl of curry, a dry amused look.'],
  takumi: [null, 'Takumi, 27, the chairman\'s grandson working incognito in accounting. Slicked-back dark hair, expensive navy suit worn casually with the collar open, a vintage watch, charming easy smile, a little too confident.'],
  goro: [null, 'Goro, 61, a gentle semi-retired engineer who keeps the rooftop garden. Thick round glasses, white stubble, beige cardigan over a checked shirt, gardening gloves, holding a small potted tomato plant, warm crinkly-eyed smile.'],
  kaito: [null, 'Kaito, 24, a hyperactive street dancer who works in logistics. Bleached mullet, silver chain, oversized tracksuit jacket over a logistics uniform, mid-gesture with a big grin, full of energy.'],
};
const jobs = [];
for (const [k, [ref, d]] of Object.entries(C)) for (const seed of [3, 17]) {
  const input = { prompt: `${STYLE} ${d} ${TAIL}`, aspect_ratio: '3:4', safety_tolerance: 5, seed };
  if (ref) input.input_images = [ref];
  jobs.push(run('black-forest-labs/flux-2-pro', input, `${A}${k}-${seed}.webp`).then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
