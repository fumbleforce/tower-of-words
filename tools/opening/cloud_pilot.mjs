// Opening pilot, one shot: the exterior master (monorail on a curving beam over the bay to the island city).
// Same visible-only prompt on several Replicate models, with and without our own line sketch
// (tools/promptlab_guides/bay-lines.png, drawn in code) as the layout guide. Budget for the pilot: under $1.50.
// Run: node tools/opening/cloud_pilot.mjs   -> art/opening/cloud/ext-<model>-<variant>.*
import fs from 'node:fs';
import { run, spent } from '../rep.mjs';
const SKETCH = 'tools/promptlab_guides/bay-lines.png';
const uri = `data:image/png;base64,${fs.readFileSync(SKETCH).toString('base64')}`;
export const PROMPT = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, '
  + 'wide view from high above a calm bay. A white elevated concrete monorail beam on round pillars curves from the lower left across the water to an island city of glass towers on the right horizon. '
  + 'A short white monorail train of four cars sits on top of the beam in the lower left, its rounded front car at the right end. '
  + 'The sea is calm with sunlight glitter. Early morning, low sun just above the horizon left of the city, soft clouds. '
  + 'Dominant sky blue and sea blue, broad white, sparse warm sunrise orange accents. No second track, no boats, no mountains behind the city.';
const SK = 'Use the attached line drawing only as the layout: horizon, the curve of the beam and pillars, where the train and the city stand. Paint over it completely; no lines from the drawing may remain. ';
const O = 'art/opening/cloud/ext-';
const jobs = [
  ['google/nano-banana-pro', { prompt: PROMPT, aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-text.png`],
  ['google/nano-banana-pro', { prompt: SK + PROMPT, image_input: [uri], aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-sketch.png`],
  ['bytedance/seedream-4.5', { prompt: PROMPT, aspect_ratio: '16:9', size: '2K' }, `${O}seedream45-text.jpg`],
  ['bytedance/seedream-4.5', { prompt: SK + PROMPT, image_input: [uri], aspect_ratio: '16:9', size: '2K' }, `${O}seedream45-sketch.jpg`],
  ['openai/gpt-image-2', { prompt: PROMPT, aspect_ratio: '3:2', quality: 'medium' }, `${O}gptimage2-text.png`],
  ['black-forest-labs/flux-2-pro', { prompt: SK + PROMPT, input_images: [SKETCH], aspect_ratio: '16:9' }, `${O}flux2pro-sketch.png`],
];
if (process.argv[1] && process.argv[1].endsWith("cloud_pilot.mjs")) {
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][0], jobs[k][2], r.status === 'fulfilled' ? 'ok ' + r.value : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('pilot spend ~$' + (spent() - before).toFixed(3), 'ledger total ~$' + spent().toFixed(2));
}
