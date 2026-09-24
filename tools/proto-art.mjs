// Prototype art: one battle scene (anime and pixel variants) + a kanji lesson for 人, 木, 休.
// Characters, battle and backgrounds: high-fidelity mature anime. Kanji mnemonics: woodblock "scroll" illustrations.
import { run, spent } from './rep.mjs';

const A = 'art/proto/';
const WOODBLOCK_REF = 'art/concept/kanji-rest.webp';
const RIN_REF = 'art/concept/rin.webp';
const ANIME = 'High-fidelity mature anime illustration, film-quality key visual in the vein of Ufotable and Kyoto Animation (Violet Evergarden): clean detailed cel shading with soft painterly lighting and atmospheric depth, realistic proportions, subtle understated expression. No thick ink outlines, no woodblock or paper texture, no text, no letters.';
const WOODBLOCK = 'Match the art style of the style reference image exactly: ink linework inspired by Edo ukiyo-e woodblock prints, flat muted colour planes, subtle washi paper grain, understated. No text, no letters, no modern objects.';
const CUTOUT = 'Plain flat light grey background with nothing else on it, full figure visible with space around it.';

const flux = (out, prompt, refs, extra = {}) => ['black-forest-labs/flux-2-pro', A + out, { prompt, ...(refs.length ? { input_images: refs } : {}), ...extra }];
const anime = (out, prompt, refs = [], extra = {}) => flux(out, `${ANIME} ${prompt}`, refs, extra);
const scroll = (out, prompt, refs = []) => flux(out, `${WOODBLOCK} ${prompt}`, [WOODBLOCK_REF, ...refs], { aspect_ratio: '1:1' });

async function batch(jobs) {
  const r = await Promise.allSettled(jobs.map(([m, f, i]) => run(m, i, f)));
  r.forEach((x, k) => console.log(jobs[k][1], x.status === 'fulfilled' ? 'ok' : x.reason.message));
}

// 1. Cast references, battle subjects, background, pixel alternatives
await batch([
  anime('jin.webp', 'Half-body portrait of Jin, a lean Japanese man in his late twenties, tired sharp eyes, light stubble, dark hair tied back, worn black haori over dark modern tactical gear, a katana at his hip, faint half-smirk. Misty ruined shrine background.', [], { aspect_ratio: '4:5' }),
  anime('moku.webp', 'Half-body portrait of Moku, a quiet broad-shouldered Japanese woodcarver in his fifties, sawdust on his forearms, simple indigo work clothes, holding a carving chisel, calm eyes. Warm workshop background.', [], { aspect_ratio: '4:5' }),
  anime('kyu.webp', 'Half-body portrait of Kyū, a young Japanese archer woman, focused gaze, hair tied high, simple hunter clothes, a long yumi bow over her shoulder. Forest edge background.', [], { aspect_ratio: '4:5' }),
  anime('rin-hf.webp', 'Half-body portrait of the same woman as in the reference: Rin, early twenties, calm observant expression, short asymmetrical black hair with a single red cord, indigo layered Heian-style jacket over a fitted dark modern bodysuit. Misty ruined mountain shrine behind her, soft morning light.', [RIN_REF], { aspect_ratio: '4:5' }),
  anime('bg-shrine.webp', 'Vertical background for a battle scene: a ruined mountain shrine courtyard at dawn, cracked stone paving in the lower half, stone lanterns, a weathered torii gate and pine trees in the distance, god rays through mist. Empty scene, no people, no creatures.', [], { aspect_ratio: '9:16' }),
  anime('golem-raw.webp', `A hulking guardian golem built of mossy carved grey stone blocks with faint carved marks, glowing pale cyan eyes, heavy stone fists, standing, full body, three-quarter view facing left. ${CUTOUT}`, [], { aspect_ratio: '1:1' }),
  anime('rin-raw.webp', `Full body of the same woman as in the reference: Rin, short asymmetrical black hair with a red cord, indigo layered jacket over a dark bodysuit, standing in a calm ready stance holding a short straight sword low, three-quarter view facing right. ${CUTOUT}`, [RIN_REF], { aspect_ratio: '2:3' }),
  ['retro-diffusion/rd-plus', A + 'px-golem.png', { prompt: 'hulking stone golem of mossy grey carved stone blocks, glowing pale eyes, heavy fists, facing left, fantasy RPG battle enemy sprite, earthy muted palette', style: 'default', width: 128, height: 128, remove_bg: true }],
  ['retro-diffusion/rd-plus', A + 'px-rin.png', { prompt: 'young japanese swordswoman, short black hair with red cord, indigo layered jacket, dark bodysuit, short sword, ready stance, facing right, RPG battle sprite', style: 'default', width: 96, height: 96, remove_bg: true }],
  ['retro-diffusion/rd-plus', A + 'px-bg-shrine.png', { prompt: 'ruined mountain shrine courtyard at dawn, cracked stone paving, stone lanterns, weathered torii gate, pine trees, mist, side-view RPG battle background', style: 'environment', width: 256, height: 384 }],
]);

// 2. Depends on step 1: erased background, cutouts, kanji mnemonics featuring the reading cast
await batch([
  flux('bg-shrine-erased.webp', 'Turn this image into an unfinished anime layout sketch: remove all colour and almost all detail, leaving only faint, sparse pale grey pencil lines on blank white paper, as if the scene was never painted. Keep the composition identical.', [A + 'bg-shrine.webp'], { aspect_ratio: 'match_input_image' }),
  ['851-labs/background-remover', A + 'golem.png', { image: A + 'golem-raw.webp' }],
  ['851-labs/background-remover', A + 'rin-battle.png', { image: A + 'rin-raw.webp' }],
  scroll('k-person-meaning.webp', 'Mnemonic illustration for the kanji 人 "person": a lone traveller seen from behind, walking away down a dirt mountain path, long legs mid-stride forming a strong inverted-V silhouette, straw cloak. Wide empty cream sky.'),
  scroll('k-person-reading.webp', 'Mnemonic illustration: Jin (the man in the second reference image) standing still and alone in the middle of a busy crowd of people on an old town street, everyone else blurred and moving, he is the one person you notice.', [A + 'jin.webp']),
  scroll('k-tree-meaning.webp', 'Mnemonic illustration for the kanji 木 "tree": a single great old tree standing alone on a hill, straight trunk, branches spreading left and right, roots spreading below, very strong symmetric silhouette. Cream sky.'),
  scroll('k-tree-reading.webp', 'Mnemonic illustration: Moku the woodcarver (the man in the second reference image) sitting at the base of a great tree, carving a small wooden figure from a fallen branch, wood shavings around him.', [A + 'moku.webp']),
  scroll('k-rest-meaning.webp', 'Mnemonic illustration for the kanji 休 "rest": a tired wandering swordsman sitting with his back against a single tree beside a dirt mountain path, eyes closed, straw hat tipped down; the person and the tree side by side. Warm late-afternoon light.'),
  scroll('k-rest-reading.webp', 'Mnemonic illustration: Kyū the archer (the woman in the second reference image) resting against a tree, her bow leaning beside her, eyes closed, a single arrow stuck in the trunk above her head.', [A + 'kyu.webp']),
]);
console.log(`total ~$${spent().toFixed(2)}`);
