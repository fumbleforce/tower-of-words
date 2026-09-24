// Company-city prototype: cast portraits (one consistent anime style, Rin's portrait as the style reference).
import { run, spent } from './rep.mjs';
const A = 'art/company/';
const REF = 'art/proto/rin-hf.webp';
const STYLE = 'High-fidelity mature anime illustration, film-quality character art in the vein of Kyoto Animation and Ufotable. Match the rendering, line quality and colouring of the reference image exactly, but draw a completely different person. Waist-up portrait, facing the viewer at a slight angle, natural relaxed pose, plain soft light-grey studio background with nothing else in it. Contemporary Japan, present day. No text, no logos with letters.';
const cast = {
  mio: 'Mio, a 24-year-old Japanese woman, short dark bob with a slightly messy fringe, sharp amused eyes, a dry half-smile, oversized grey cardigan over a white shirt, company ID lanyard, holding a canned coffee.',
  sayaka: 'Sayaka, a 32-year-old Japanese woman, long dark-brown hair loosely tied back with loose strands, reading glasses pushed up on her head, rolled-up shirt sleeves, relaxed confident smile, company ID lanyard.',
  hana: 'Hana, a 25-year-old Japanese woman, high ponytail, bright curious eyes, light denim jacket over a striped top, small notebook and pen in hand, a camera strap over her shoulder, company press armband without text.',
  rei: 'Rei, a 23-year-old Japanese woman, long straight black hair, sharp tailored navy suit, poised and confident, a small competitive smile, arms loosely crossed, company ID lanyard.',
  daigo: 'Daigo, a 28-year-old Japanese man, tall and broad, short spiky hair, big friendly grin, dark blue work coveralls with the top half tied around his waist, grey t-shirt, towel around his neck.',
  tomi: 'Tomi, a 55-year-old Japanese woman who runs a staff cafeteria, kind round face, warm laugh lines, white cafeteria apron, patterned bandana over her hair.',
};
const r = await Promise.allSettled(Object.entries(cast).map(([k, d]) =>
  run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d}`, input_images: [REF], aspect_ratio: '4:5' }, `${A}${k}.webp`)));
r.forEach((x, i) => console.log(Object.keys(cast)[i], x.status === 'fulfilled' ? 'ok' : x.reason.message));
console.log('spent', spent());
