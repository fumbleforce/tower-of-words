// Cast v3: one style anchor, fixed style/lighting/framing blocks, two seeds per character.
import { run, spent } from './rep.mjs';
const A = 'art/company/v3/';
const ANCHOR = 'art/company/styles/mio-painterly.webp';
const STYLE = 'Painted in exactly the same style as image 1: a digital painting for a grown-up visual novel, anime-influenced but grounded, visible textured brush strokes, soft painterly shading with slightly rough edges, loose clean line art, muted desaturated colours, realistic adult proportions and faces.';
const LIGHT = 'Soft key light from the upper left, cool fill light from the right, a faint warm rim light on the right edge.';
const FRAME = 'Waist-up portrait, body turned three-quarters to the left, looking at the viewer, head in the upper third of the frame, on a flat plain light grey background #D9DCE0.';
const ID = 'This is the same person as in image 2: keep their face, hairstyle, outfit and accessories. Use image 1 only for the painting style, never for the person.';
const CAST = {
  mio: [null, 'Mio, a 24-year-old office worker who lives like a shut-in gamer, the same young woman as in image 1: messy chin-length dark hair with faded teal underneath, tired half-lidded eyes with dark circles, the hood of an oversized faded black hoodie half up, gaming headset around her neck, energy drink can in one hand, crooked company ID lanyard, flat bored expression.'],
  sayaka: [null, 'Sayaka, a 32-year-old team leader, relaxed and quietly brilliant: wavy dark-brown hair held up in a simple claw clip, red-framed glasses, a plain white shirt with the sleeves rolled up, company ID lanyard, an easy, knowing half-smile.'],
  hana: [null, 'Hana, a 25-year-old in-house newspaper reporter, eager and curious: short permed chestnut hair with a few colourful hairpins, light freckles, olive bomber jacket with enamel pins, a vintage film camera held at chest height, bright open grin.'],
  rei: [null, 'Rei, a 23-year-old top salesperson, sharp and ambitious: long silver-grey hair in a sleek high ponytail, thin gold hoop earrings, tailored white suit over a black shirt, small gold pin on the lapel, tablet held against her hip, a cool, challenging look with a slight smile.'],
  daigo: [null, 'Daigo, a 28-year-old production floor worker with an ordinary, slightly soft build: bleached blond buzzcut, friendly round face, faded grey t-shirt, dark blue work coveralls tied around his waist, white hard hat tucked under one arm, a wide easy grin, natural skin tone.'],
  tomi: [null, 'Tomi, a 58-year-old Osaka-born woman who runs the company canteen, loud and warm: curly grey-streaked permed hair under a bright patterned bandana, big round earrings, leopard-print shirt under a white apron, a big ladle in one hand, laughing.'],
  guard: [null, 'The gate guard, a stern Japanese man in his fifties: grey crew cut under a navy security cap, heavy-lidded tired eyes, deep lines around the mouth, navy security uniform with a shoulder radio and an earpiece, arms folded, unimpressed.'],
};
const jobs = [];
const ONLY = process.argv.slice(2);
for (const [k, [ref, desc]] of Object.entries(CAST)) for (const seed of [11, 42]) {
  if (ONLY.length && !ONLY.includes(k)) continue;
  const prompt = [desc, ref ? ID : '', STYLE, LIGHT, FRAME].filter(Boolean).join(' ');
  jobs.push(run('black-forest-labs/flux-2-pro', { prompt, input_images: ref ? [ANCHOR, ref] : [ANCHOR], aspect_ratio: '4:5', seed }, `${A}${k}-${seed}.webp`, { force: ONLY.includes(k) })
    .then(() => console.log('ok', k, seed), e => console.log('FAIL', k, seed, e.message.slice(0, 100))));
}
await Promise.all(jobs);
console.log('spent', spent());
