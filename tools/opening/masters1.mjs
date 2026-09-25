// Opening masters, batch 1 (intro + verse 1). GPT Image 2 (the only model that got C right), medium quality.
// Each prompt follows Reference prompt 2 (camera stated plainly, positions in frame terms, counts, colours, one "No ..." line).
// Our approved master C is attached as the style and light reference so every shot matches it; the main character's shot also
// gets his approved sprite (ours) as the design reference. Budget for the batch: $1.50. Run: node tools/opening/masters1.mjs
import { run, spent } from '../rep.mjs';
const C = 'art/opening/cloud/c-gptimage2-1.webp';
const MC = 'art/production/M/02-it-guy-601.png';
const STYLE = 'Match the painting style, colours and golden light of the first attached image. ';
const HEAD = 'anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, ';
const PAL = 'Dominant gold and orange, broad deep amber shadow, sparse pale blue sky between the clouds.';
export const MASTERS = {
  'm-sky': [HEAD + 'no humans, scenery, tall vertical view at sea level looking toward the sunrise over a flat calm sea. The horizon is a straight line near the bottom edge. '
    + 'A huge sky fills everything above it: towering cumulus clouds lit gold from below, light rays fanning up from the sun, which sits on the horizon in the centre. '
    + PAL + ' No land, no buildings, no boats, no birds.', '2:3'],
  'm-pass': [HEAD + 'no humans, scenery, flat side view close to an elevated concrete monorail beam at sunrise. The beam runs level across the whole width of the image just below the middle. '
    + 'A monorail train of three cars sits on top of the beam and fills most of the width, dark in silhouette, its windows glowing warm. '
    + 'The big sun sits low behind the train, right of centre, with light rays around it. The sea below reflects the gold sky. ' + PAL + ' No city, no second track, no people.', '3:2'],
  'm-him': [HEAD + 'flat side view inside a monorail carriage at sunrise. In the left third, the head and shoulders of the man from the second attached image in profile, facing right, '
    + 'dark and in shadow against the light, with glasses, a short beard, a grey hoodie under a navy blazer. Behind him a large window fills the rest of the image: '
    + 'a calm sea far below, the horizon low in the window, the rising sun and golden clouds. Warm light rims his hair and glasses. ' + PAL + ' No other people, no text.', '3:2'],
  'm-window': [HEAD + 'no humans, scenery, frontal view of one wide side window of a monorail carriage, seen from the seat opposite. The window fills the middle of the image, '
    + 'its frame and two seat backs dark in silhouette at the bottom. Through the window: a calm sea far below, the horizon low in the window, the rising sun and golden clouds, '
    + 'shafts of warm light falling into the carriage. ' + PAL + ' No track or beam outside the window, no people, no text.', '3:2'],
  'm-city': [HEAD + 'no humans, scenery, flat side view from sea level. A man-made island city of glass office towers stands as a band along the horizon across the middle of the image, '
    + 'its glass catching the low sun and glowing gold. A huge sky with towering golden clouds fills the upper two thirds. The calm sea in the lower third reflects the towers. '
    + PAL + ' No mountains, no boats, no bridge, no single landmark tower.', '3:2'],
  'm-city-2': [HEAD + 'no humans, scenery, flat side view from sea level. A man-made island city of glass office towers stands on the horizon across the middle of the image, '
    + 'both ends of the island visible with open sea beyond each end, its glass catching the low sun and glowing gold. A huge sky with towering golden clouds fills the upper two thirds. '
    + 'The calm sea in the lower third reflects the towers. ' + PAL + ' No mountains, no boats, no bridge, no single landmark tower.', '3:2'],
  'm-station': [HEAD + 'no humans, scenery, flat side view across an empty elevated monorail station platform at sunrise. A white monorail car stands at the platform in the middle band of the image, '
    + 'its doors closed, behind a row of glass platform screen doors. Low morning sun from the right throws long warm light and shadows across the tiled platform floor in the foreground. '
    + 'A white steel canopy along the top edge, golden sky above the car roof. ' + PAL + ' No rails, no people, no text or signs.', '3:2'],
  'm-street': [HEAD + 'frontal view down a wide straight pedestrian street between glass office towers at sunrise, one-point perspective, the street centred. '
    + 'The low sun sits between the towers at the end of the street, with long warm light and deep amber shadows. In the middle of the street, small, the man from the second attached image '
    + 'seen from behind, walking away, grey hoodie under a navy blazer, short dark-blond hair. Trees in planters along both sides. ' + PAL + ' No other people, no cars, no text or signs.', '2:3'],
};
const O = 'art/opening/masters/';
const jobs = Object.entries(MASTERS).map(([k, [prompt, ar]]) => {
  const imgs = [C];
  if (k === 'm-him' || k === 'm-street') imgs.push(MC);
  return ['openai/gpt-image-2', { prompt: STYLE + prompt, input_images: imgs, aspect_ratio: ar, quality: 'medium' }, k.match(/-\d$/) ? `${O}${k}.png` : `${O}${k}-1.png`];
});
const before = spent();
const res = await Promise.allSettled(jobs.map(([m, i, o]) => run(m, i, o)));
res.forEach((r, k) => console.log(jobs[k][2], r.status === 'fulfilled' ? 'ok ' + r.value : 'FAIL ' + r.reason.message.slice(0, 200)));
console.log('batch spend ~$' + (spent() - before).toFixed(3), 'total ~$' + spent().toFixed(2));
