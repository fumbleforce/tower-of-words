// Cast v2: distinctive designs; same style reference as v1.
import { run, spent } from './rep.mjs';
const A = 'art/company/v2/';
const REF = 'art/proto/rin-hf.webp';
const STYLE = 'High-fidelity mature anime illustration, film-quality character art in the vein of Kyoto Animation and Ufotable. Match the rendering, line quality and colouring of the reference image exactly, but draw a completely different person with a distinctive, memorable character design. Waist-up portrait, facing the viewer at a slight angle, expressive natural pose, plain soft light-grey studio background with nothing else in it. Contemporary Japan, present day. No text, no letters, no logos.';
const cast = {
  mio: 'Mio, 24, a sardonic office worker. Chin-length dark hair with teal dyed underneath (inner colour), several small silver ear piercings, oversized black hoodie under an unbuttoned grey blazer, company ID lanyard, over-ear headphones around her neck, taking a bite of a melon pan, one eyebrow raised, unimpressed smirk.',
  sayaka: 'Sayaka, 32, a laid-back but brilliant team leader. Wavy dark-brown hair twisted up in a tortoiseshell claw clip with loose strands, bold red-framed glasses, pencil tucked behind one ear, white shirt with rolled sleeves and a loosened thin tie, a lollipop stick in the corner of her mouth, lazy knowing grin, company ID lanyard.',
  hana: 'Hana, 25, an eager in-house newspaper reporter. Short permed chestnut hair held with colourful hairpins, light freckles, big bright eyes, olive bomber jacket covered in quirky enamel pins, a vintage film camera raised halfway to her face, a plain white armband on her sleeve, excited open-mouthed grin.',
  rei: 'Rei, 23, a fiercely ambitious top salesperson. Long silver-grey dyed hair in a sleek high ponytail, sharp eyeliner, thin gold hoop earrings, tailored white suit with a black shirt, a gold award pin on her lapel, holding a tablet against her hip, cool challenging stare with a slight smile.',
  daigo: 'Daigo, 28, a big-hearted production floor worker. Tall and broad, sun-tanned, bleached blond buzzcut, a thin notch shaved into his left eyebrow, fitted black t-shirt, dark blue work coveralls tied around his waist, a white hard hat under one arm, wide easy grin. Natural skin tone, no blush on his cheeks.',
  tomi: 'Tomi, 58, the loud, warm Osaka-born auntie who runs the company canteen. Curly permed grey-streaked hair under a bright patterned bandana, big round earrings, leopard-print shirt under a white canteen apron, holding a big ladle like a microphone, laughing heartily.',
  guard: 'The gate guard, a stern Japanese man in his fifties. Grey crew cut under a navy security cap, heavy-lidded tired eyes, deep lines around his mouth, navy security uniform with a radio on the shoulder and an earpiece, arms folded, unimpressed and authoritative.',
};
const r = await Promise.allSettled(Object.entries(cast).map(([k, d]) =>
  run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d}`, input_images: [REF], aspect_ratio: '4:5' }, `${A}${k}.webp`)));
r.forEach((x, i) => console.log(Object.keys(cast)[i], x.status === 'fulfilled' ? 'ok' : x.reason.message));
console.log('spent', spent());
