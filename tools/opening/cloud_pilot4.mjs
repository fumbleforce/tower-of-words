// Pilot round 4: no direction or cab wording (monorails have cabs at both ends); one plain sentence for detail.
import fs from 'node:fs';
import { run, spent } from '../rep.mjs';
import { PROMPT } from './cloud_pilot.mjs';
const SKETCH = 'tools/promptlab_guides/bay-lines.png';
const uri = `data:image/png;base64,${fs.readFileSync(SKETCH).toString('base64')}`;
export const P4 = PROMPT.replace('A short white monorail train of four cars sits on top of the beam in the lower left, its rounded front car at the right end.',
  'A detailed modern monorail train of four cars on the concrete monorail beam in the lower left.');
const SK = 'Use the attached line drawing only as the layout: horizon, the curve of the beam and pillars, where the train and the city stand. Paint over it completely; no lines from the drawing may remain. ';
const O = 'art/opening/cloud/ext5-';
const jobs = [1, 2, 3].map(k => ['google/nano-banana-pro', { prompt: SK + P4, image_input: [uri], aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-${k}.png`]);
jobs.push(['openai/gpt-image-2', { prompt: SK + P4, input_images: [SKETCH], aspect_ratio: '3:2', quality: 'medium' }, `${O}gptimage2-1.png`]);
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][2], r.status === 'fulfilled' ? 'ok' : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('round 4 spend ~$' + (spent() - before).toFixed(3), 'ledger total ~$' + spent().toFixed(2));
