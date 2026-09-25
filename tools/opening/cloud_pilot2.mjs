// Pilot round 2 (one change each). Round 1: every model but one put the train's nose at the lower-left end, i.e. driving
// away from the island city; the one that got the direction right drew pillars standing in front of the beam.
// A: edit the best-looking round-1 image (Nano Banana Pro, sketch) so the train faces the city. Same edit on Seedream.
// B: Nano Banana Pro from the sketch, the train described from behind instead of by its front.
import fs from 'node:fs';
import { run, spent } from '../rep.mjs';
import { PROMPT } from './cloud_pilot.mjs';
const uri = f => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
const SRC = 'art/opening/cloud/ext-nanobananapro-sketch.png';
const SKETCH = 'tools/promptlab_guides/bay-lines.png';
const EDIT = 'Edit only the train. Turn the monorail train around so it faces the island city: its rounded driver\'s front car is at the right end, nearest the city, and the flat rear of the last car is at the left end. Keep the same four cars, the same position on the beam, and everything else in the picture unchanged.';
const BEHIND = PROMPT.replace('A short white monorail train of four cars sits on top of the beam in the lower left, its rounded front car at the right end.',
  'A short white monorail train of four cars sits on top of the beam in the lower left, seen from behind: the flat back of its last car is at the left end, and the train points toward the city.');
const SK = 'Use the attached line drawing only as the layout: horizon, the curve of the beam and pillars, where the train and the city stand. Paint over it completely; no lines from the drawing may remain. ';
const O = 'art/opening/cloud/ext2-';
const jobs = [
  ['google/nano-banana-pro', { prompt: EDIT, image_input: [uri(SRC)], aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-edit.png`],
  ['bytedance/seedream-4.5', { prompt: EDIT, image_input: [uri(SRC)], aspect_ratio: '16:9', size: '2K' }, `${O}seedream45-edit.jpg`],
  ['google/nano-banana-pro', { prompt: SK + BEHIND, image_input: [uri(SKETCH)], aspect_ratio: '16:9', resolution: '2K', output_format: 'png' }, `${O}nanobananapro-behind.png`],
];
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][2], r.status === 'fulfilled' ? 'ok' : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('round 2 spend ~$' + (spent() - before).toFixed(3), 'ledger total ~$' + spent().toFixed(2));
