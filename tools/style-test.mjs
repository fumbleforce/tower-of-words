// Style exploration: the same two characters in four distinct styles.
import { run, spent } from './rep.mjs';
const A = 'art/company/styles/';
const STYLES = {
  cel90s: 'Late-1990s theatrical anime film style: hand-painted cel look, thin precise ink lines, realistic adult proportions and faces, muted filmic colours, soft film grain, restrained shading with one hard shadow tone. Grounded and cinematic.',
  seinen: 'Colour illustration in the style of a modern seinen manga: confident brush-ink linework with varied line weight, flat muted colour fills, subtle screentone texture, realistic slightly imperfect faces, understated and observational.',
  painterly: 'Painterly graphic-novel character art: visible textured brush strokes, strong simple shapes, limited muted palette with one warm accent, dramatic side light, expressive but realistic faces. Illustrated, not photographic.',
  graphic: 'Bold stylised graphic illustration: thick confident outlines, flat colours in a limited palette, halftone dot shading, sharp angular shapes, high contrast, poster-like character art.',
};
const CHARS = {
  rei: ['art/company/v2/rei.webp', 'The same woman as in the reference image, same design: Rei, 23, ambitious salesperson, long silver-grey dyed hair in a sleek high ponytail, thin gold hoop earrings, tailored white suit over a black shirt, gold pin on the lapel, holding a tablet, cool challenging stare with a slight smile.'],
  mio: [null, 'Mio, 24, an office worker who lives like a shut-in gamer: messy, slightly greasy chin-length dark hair with faded teal underneath, tired half-lidded eyes with dark circles, slouching, the hood of an oversized faded black hoodie half pulled up, a gaming headset around her neck, an energy drink can in one hand, a company ID lanyard hanging crooked, a flat bored expression.'],
};
const jobs = [];
for (const [s, sp] of Object.entries(STYLES)) for (const [c, [ref, cp]] of Object.entries(CHARS)) {
  const input = { prompt: `${sp} Waist-up character portrait, facing the viewer at a slight angle, plain light-grey background. Contemporary Japan. No text, no letters. ${cp}`, aspect_ratio: '4:5' };
  if (ref) input.input_images = [ref];
  jobs.push(run('black-forest-labs/flux-2-pro', input, `${A}${c}-${s}.webp`).then(() => console.log('ok', c, s), e => console.log('FAIL', c, s, e.message.slice(0, 120))));
}
await Promise.all(jobs);
console.log('spent', spent());
