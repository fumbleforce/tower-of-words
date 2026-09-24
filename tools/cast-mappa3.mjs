// MAPPA cast, round 3: three friend options and two new women.
import { run, spent } from './rep.mjs';
const A = 'art/company/mappa/';
const STYLE = 'Anime character portrait, modern MAPPA anime still, sharp lines, cinematic lighting.';
const TAIL = 'Adult proportions and a mature face. Close waist-up framing with the head in the upper third, filling the frame, plain light grey background. No text or logos.';
const C = {
  jun: 'Jun, 40, the quiet bartender at the company bar who has a past he never talks about. Long dark hair tied back, faint scar through one eyebrow, black waistcoat over a white shirt with sleeves rolled, polishing a glass, a calm, knowing half-smile.',
  haruto: 'Haruto, 30, a soft-spoken R&D chemist obsessed with fermentation. Messy wavy hair, lab coat over a knitted vest, safety goggles pushed up on his head, holding up a glass jar of pickles to the light, delighted and a little awkward.',
  shin: 'Shin, 38, a tired single dad who maintains the security systems. Five o\'clock shadow, tousled short hair, grey work jacket with a tool belt, a child\'s hair tie around his wrist, coffee in hand, dry deadpan look.',
  nanami: 'Nanami, 29, a stoic company security officer. Tall and athletic, short black hair with an undercut, black tactical uniform, radio on her shoulder, arms at her sides, serious face with a faint blush as if caught off guard.',
  yuzuki: 'Yuzuki, 31, the company\'s glamorous PR spokeswoman and in-house celebrity. Glossy wavy chestnut hair, elegant makeup, fitted cream blouse and pencil skirt, pearl earrings, holding a microphone, a flawless practised smile with tired eyes.',
};
const jobs = [];
for (const [k, d] of Object.entries(C)) for (const seed of [3, 17]) {
  jobs.push(run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d} ${TAIL}`, aspect_ratio: '3:4', safety_tolerance: 5, seed }, `${A}${k}-${seed}.webp`)
    .then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
