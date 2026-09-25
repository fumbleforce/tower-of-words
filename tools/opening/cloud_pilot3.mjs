// Pilot round 3 (one change): name the cab by its parts. Rounds 1-2: the models kept the driver's cab at the lower-left end
// (away from the island city), even when told the front is at the right or the train is seen from behind.
import fs from 'node:fs';
import { run, spent } from '../rep.mjs';
import { PROMPT } from './cloud_pilot.mjs';
const SKETCH = 'tools/promptlab_guides/bay-lines.png';
const uri = `data:image/png;base64,${fs.readFileSync(SKETCH).toString('base64')}`;
const CAB = PROMPT.replace('A short white monorail train of four cars sits on top of the beam in the lower left, its rounded front car at the right end.',
  'A short white monorail train of four cars sits on top of the beam in the lower left. The driver\'s cab with its big curved windshield and headlights is at the right end of the train, the end closest to the city. The left end of the train is a plain flat back with small red tail lights.');
const SK = 'Use the attached line drawing only as the layout: horizon, the curve of the beam and pillars, where the train and the city stand. Paint over it completely; no lines from the drawing may remain. ';
const O = 'art/opening/cloud/ext3-';
const jobs = [
  ['google/nano-banana-pro', { prompt: SK + CAB, image_input: [uri], aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-cab.png`],
  ['openai/gpt-image-2', { prompt: SK + CAB, input_images: [SKETCH], aspect_ratio: '3:2', quality: 'medium' }, `${O}gptimage2-cab.png`],
];
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][2], r.status === 'fulfilled' ? 'ok ' + r.value : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('round 3 spend ~$' + (spent() - before).toFixed(3), 'ledger total ~$' + spent().toFixed(2));
