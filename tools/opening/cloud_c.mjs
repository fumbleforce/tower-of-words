// Option C master for the opening's exterior: a side-on silhouette of the monorail on its beam against a big morning sky
// (the look of the reference OP frame Jørgen sent). Reference prompt 2 style: camera plainly, positions in frame terms,
// colours, one "No ..." line. Budget: $0.50. Run: node tools/opening/cloud_c.mjs
import { run, spent } from '../rep.mjs';
export const PC = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, '
  + 'flat side view at the height of the water, looking straight across a calm bay at sunrise. '
  + 'A long straight elevated concrete monorail beam runs level across the whole width of the image in the lower quarter, on tall pillars standing in the sea. '
  + 'A short monorail train of four cars sits on top of the beam, left of centre, dark in silhouette against the light. '
  + 'A huge dramatic morning sky fills the upper three quarters: towering cumulus clouds lit gold and orange from below, light rays breaking through. '
  + 'The sun sits just above the horizon, right of centre, behind the beam. The sea reflects the golden sky. '
  + 'Dominant gold and orange, broad deep amber shadow, sparse pale blue sky between the clouds. No city, no mountains, no boats, no second track.';
const O = 'art/opening/cloud/c-';
const jobs = [
  ['google/nano-banana-pro', { prompt: PC, aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-1.png`],
  ['openai/gpt-image-2', { prompt: PC, aspect_ratio: '3:2', quality: 'medium' }, `${O}gptimage2-1.png`],
  ['openai/gpt-image-2', { prompt: PC, aspect_ratio: '3:2', quality: 'medium' }, `${O}gptimage2-2.png`],
];
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][2], r.status === 'fulfilled' ? 'ok ' + r.value : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('C spend ~$' + (spent() - before).toFixed(3), 'total ~$' + spent().toFixed(2));
