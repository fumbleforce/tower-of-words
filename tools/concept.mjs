// Concept batch 1: four images to judge the art direction before spending more.
import { run, spent } from './rep.mjs';

const ILLU = 'Grounded painterly illustration, ink linework inspired by Edo ukiyo-e woodblock prints fused with modern digital painting, flat colour planes, subtle washi paper grain, limited muted palette, cinematic composition, mature and understated, realistic proportions. No text, no letters, no watermark.';
const ERASE = 'Parts of the world are erased: clean blank white paper squares eat into the scene, with thin glowing cyan seams along their edges.';

const jobs = [
  ['black-forest-labs/flux-2-pro', 'art/concept/rin.webp', {
    prompt: `${ILLU} Half-body portrait of Rin, a young Japanese woman in her early twenties with a calm, observant expression, short asymmetrical black hair tied with a single red cord, wearing an indigo layered Heian-style jacket over a fitted modern dark bodysuit. The ends of her sleeves dissolve into floating blank white paper squares with cyan seams. Soft rim light, muted background of misty temple ruins.`,
    aspect_ratio: '4:5',
  }],
  ['black-forest-labs/flux-2-pro', 'art/concept/blank-gate.webp', {
    prompt: `${ILLU} ${ERASE} Wide establishing shot: an enormous ancient stone gate in a misty valley at dawn, carved with half-erased glyphs, a lone traveller in a dark coat standing small at its foot. Palette: bone white, slate grey, pale cyan accents.`,
    aspect_ratio: '16:9',
  }],
  ['black-forest-labs/flux-2-pro', 'art/concept/kanji-rest.webp', {
    prompt: `${ILLU} Mnemonic illustration for the kanji meaning "rest": a tired wandering swordsman leaning his back against a single lone tree at the side of a mountain road, eyes closed, straw hat tipped down, the person and the tree side by side forming a simple strong silhouette. Warm late-afternoon light, cream paper background.`,
    aspect_ratio: '1:1',
  }],
  ['retro-diffusion/rd-plus', 'art/concept/golem.png', {
    prompt: 'a hulking stone golem enemy made of stacked carved stone blocks, some blocks replaced by blank white paper squares with cyan glowing seams, glowing cyan eyes, side view, fantasy RPG battle sprite',
    style: 'default', width: 128, height: 128, remove_bg: true,
  }],
];

const out = await Promise.allSettled(jobs.map(([m, f, i]) => run(m, i, f)));
out.forEach((r, k) => console.log(jobs[k][1], r.status === 'fulfilled' ? 'ok' : r.reason.message));
console.log(`total ~$${spent().toFixed(2)}`);
