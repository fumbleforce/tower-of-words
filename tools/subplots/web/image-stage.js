// The shot's staging (notes/tools/scene-editor.md, Composer, Direct the shot): where each person stands, which way
// they face and look, their expression and height, contact, the light's direction and the mood. It is kept on the
// composition as `stage` and turned into prompt words here, so the composer and the recipe command
// (tools/subplots/compose.mjs) say the same thing. The geometry the stage draws (stage-view.js) also lives here.
// Shot size, angle and lens are camera blocks; cameraKind() says which row a camera block belongs in.

export const FACING = [['camera', 'Camera'], ['left', 'Left'], ['right', 'Right'], ['away', 'Away'], ['partner', 'Toward']];
export const GAZE = [['viewer', 'The viewer'], ['partner', ''], ['away', 'Away'], ['down', 'Down'], ['up', 'Up']];
export const HEIGHTS = [['short', 'Shorter'], ['', 'Average'], ['tall', 'Taller']];
export const LIGHT_FROM = [['front', 'Front', 'front lighting'], ['left', 'Left', 'light coming from the left'], ['right', 'Right', 'light coming from the right'],
  ['back', 'Behind', 'backlighting, rim light'], ['above', 'Above', 'light from above']];
export const MOODS = ['calm', 'warm and cosy', 'cheerful', 'playful', 'tense', 'awkward', 'romantic', 'melancholy', 'lonely', 'mysterious', 'dramatic'];
export const EXPRESSIONS = ['smiling', 'laughing', 'neutral expression', 'serious', 'surprised', 'embarrassed, blushing', 'annoyed', 'sad', 'tired', 'focused', 'smug', 'shy'];

// Older camera blocks have no `group`: the ones the dashboard shipped with are sorted by id. A block's own `group`
// and `diagram` fields (tools/imagegen/web/blocks.js) win.
const KNOWN = {close: ['shot', 'head'], wide: ['shot', 'full'], 'eye-level': ['angle', 'eye'], above: ['angle', 'high'], below: ['angle', 'low'],
  overhead: ['angle', 'top'], dutch: ['other', 'tilt'], behind: ['other', 'behind'], side: ['other', 'side'], pov: ['other', 'pov'],
  selfie: ['other', 'selfie'], shoulder: ['other', 'shoulder'], viewer: ['other', 'viewer']};
export const CAMERA_ROWS = [['shot', 'Shot'], ['angle', 'Angle'], ['lens', 'Lens']];
export const DIAGRAMS = {
  shot: [['face', 'Face'], ['head', 'Head and shoulders'], ['chest', 'Upper body'], ['thighs', 'Cowboy'], ['full', 'Full body'], ['wide', 'Wide']],
  angle: [['eye', 'Eye level'], ['high', 'From above'], ['low', 'From below'], ['top', 'Overhead']],
  lens: [['wide-lens', 'Wide-angle'], ['normal', 'Normal'], ['long', 'Telephoto'], ['shallow', 'Shallow focus']],
  other: [['tilt', 'Tilted'], ['behind', 'From behind'], ['side', 'Side view'], ['pov', 'Point of view'], ['selfie', 'Selfie'], ['shoulder', 'Over the shoulder'], ['viewer', 'Looking at the viewer']],
};
export function cameraKind(block) {
  const d = block?.data || {}, known = KNOWN[block?.id] || [];
  const group = ['shot', 'angle', 'lens'].includes(d.group) ? d.group : known[0] || 'other';
  return {group, diagram: d.diagram || known[1] || ''};
}

// A character block as the stage names it: the unnamed generic person is "the other person".
export function personOf(p) {
  const d = p.data || {};
  const name = d.generic ? (!d.name || /unnamed/i.test(d.name) ? 'the other person' : d.name) : d.name || p.id;
  return {id: p.id, name, female: (d.gender || (d.generic ? 'male' : 'female')) === 'female'};
}
// The people in the shot, in its order: the chosen characters, then the unnamed person.
export function stageCast(c, presets) {
  const chars = (c.characters || []).map(id => (presets.character || []).find(p => p.id === id)).filter(Boolean);
  const generic = c.man && (presets.character || []).find(p => p.data.generic && !p.archived);
  return (generic && !chars.includes(generic) ? [...chars, generic] : chars).map(personOf);
}

// The composition's stage, made whole. People are keyed by character id.
export function stageOf(c) {
  const s = c.stage && typeof c.stage === 'object' ? c.stage : {};
  c.stage = {people: {}, contact: '', lightFrom: '', mood: '', ...s};
  c.stage.people = {...(s.people || {})};
  return c.stage;
}
// Where a person stands when the author hasn't placed them: spread across the frame, all at the front.
export function placeOf(stage, id, index, count) {
  const p = stage.people?.[id] || {};
  const spread = count <= 1 ? 0.5 : 0.22 + 0.56 * index / (count - 1);
  return {x: p.x ?? spread, d: p.d ?? 0, facing: p.facing || '', gaze: p.gaze || '', toward: p.toward || '', lookAt: p.lookAt || '', expression: p.expression || '', height: p.height || '', placed: !!p.placed};
}

// What the camera blocks chosen for the shot mean for the drawing: shot size, angle, lens, tilt.
export function cameraSetup(c, presets) {
  const out = {shot: 'thighs', angle: 'eye', lens: 'normal', tilt: false, chosen: false};
  for (const id of c.cameras || []) {
    const b = (presets.camera || []).find(p => p.id === id); if (!b) continue;
    const k = cameraKind(b);
    if (k.group === 'shot' && k.diagram) { out.shot = k.diagram; out.chosen = true; }
    if (k.group === 'angle' && k.diagram) out.angle = k.diagram;
    if (k.group === 'lens' && k.diagram) out.lens = k.diagram;
    if (k.diagram === 'tilt') out.tilt = true;
  }
  return out;
}
// The pose block's words, read for the stand-in's shape.
export function poseShape(words = '') {
  const w = String(words).toLowerCase();
  if (/\b(lying|lies|lie down|lying down|in bed)\b/.test(w)) return 'lie';
  if (/\b(sit|sits|sitting|seated|on a bench|on a chair)\b/.test(w)) return 'sit';
  if (/\b(crouch|crouching|squat|kneel|kneeling)\b/.test(w)) return 'crouch';
  if (/\b(walk|walking|running|stride)\b/.test(w)) return 'walk';
  if (/\blean/.test(w)) return 'lean';
  return 'stand';
}

const side = x => x < 0.36 ? 'on the left' : x > 0.64 ? 'on the right' : 'in the middle';
const depth = d => d < 0.25 ? 'in the foreground' : d > 0.6 ? 'in the background' : 'further back';
// The staging in prompt words. people: [{id, name, female}] in the shot's order. Placement is said only for people
// the author placed on the stage; everything else only when chosen.
export function stageWords(c, people) {
  const stage = stageOf({stage: c.stage});
  const name = id => people.find(p => p.id === id)?.name || 'the other person';
  const other = (p, id) => id && id !== p.id && people.some(q => q.id === id) ? id : people.find(q => q.id !== p.id)?.id;
  const lines = people.map((p, i) => {
    const s = placeOf(stage, p.id, i, people.length), parts = [];
    if (s.placed) parts.push([side(s.x), people.length > 1 ? depth(s.d) : ''].filter(Boolean).join(' ') + (people.length === 1 ? ' of the picture' : ''));
    const toward = other(p, s.toward), at = other(p, s.lookAt);
    const facing = {camera: 'facing the viewer', left: 'facing left', right: 'facing right', away: (p.female ? 'her' : 'his') + ' back to the viewer',
      partner: toward ? 'turned toward ' + name(toward) : ''}[s.facing];
    const gaze = {viewer: 'looking at the viewer', partner: at ? 'looking at ' + name(at) : '', away: 'looking away', down: 'looking down', up: 'looking up'}[s.gaze];
    parts.push(facing, gaze, s.expression.trim());
    const said = parts.filter(Boolean);
    return said.length ? p.name + ' ' + said.join(', ') : '';
  });
  const placed = people.map((p, i) => ({p, s: placeOf(stage, p.id, i, people.length)}));
  const tall = placed.filter(x => x.s.height === 'tall'), short = placed.filter(x => x.s.height === 'short'), mid = placed.filter(x => !x.s.height);
  const heights = [];
  if (people.length > 1) for (const t of tall) for (const o of [...mid, ...short]) heights.push(t.p.name + ' is taller than ' + o.p.name);
  if (people.length > 1 && !tall.length) for (const s of short) for (const o of mid) heights.push(s.p.name + ' is shorter than ' + o.p.name);
  let distance = '';
  if (placed.length === 2 && placed.every(x => x.s.placed)) {
    const gap = Math.hypot(placed[0].s.x - placed[1].s.x, (placed[0].s.d - placed[1].s.d) * 0.8);
    distance = gap < 0.2 ? 'They stand close together' : gap > 0.55 ? 'They stand far apart' : '';
  }
  const light = LIGHT_FROM.find(l => l[0] === stage.lightFrom)?.[2] || '';
  const mood = stage.mood.trim() ? (/mood|atmosphere/i.test(stage.mood) ? stage.mood.trim() : stage.mood.trim() + ' mood') : '';
  const contact = stage.contact.trim().replace(/^./, ch => ch.toUpperCase());
  return {people: [...lines, ...heights, distance, contact].filter(Boolean).join('. '), light, mood};
}

// Where the placed people stand, said back to the author under the stage ('Placed: Mio left, in front.').
export function stageSummary(c, people) {
  const stage = stageOf({stage: c.stage});
  if (!people.length) return '';
  const short = {'on the left': 'left', 'on the right': 'right', 'in the middle': 'middle', 'in the foreground': 'in front', 'further back': 'further back', 'in the background': 'at the back'};
  const where = people.map((p, i) => {
    const s = placeOf(stage, p.id, i, people.length);
    return s.placed ? p.name + ' ' + [short[side(s.x)], people.length > 1 ? short[depth(s.d)] : ''].filter(Boolean).join(', ') : '';
  }).filter(Boolean);
  return where.length ? 'Placed: ' + where.join('. ') + '.' : '';
}

// Frame geometry for the drawing, in units of the frame's height (the frame is aspect × 1). Body in head units:
// head top 0, eyes 0.5, chin 1, shoulders 1.4, waist 3.3, knees 5.6, feet 7.5.
const VISIBLE = {face: 1.15, head: 2.2, chest: 3.5, thighs: 5.3, full: 7.9, wide: 19};
const HEADROOM = {face: -0.04, head: 0.1, chest: 0.12, thighs: 0.1, full: 0.06, wide: 0.3};
const LENS_DEPTH = {'wide-lens': 1.6, normal: 1, long: 0.45, shallow: 0.8};
const POSE_DROP = {stand: 0, walk: 0, lean: 0.2, sit: 2.2, crouch: 3.2, lie: 5.6};
export function figures(c, presets, people) {
  const stage = stageOf({stage: c.stage}), cam = cameraSetup(c, presets);
  const pose = poseShape((presets.pose || []).find(p => p.id === c.pose)?.data.text || c.pose || '');
  const s = (1 - Math.max(0, HEADROOM[cam.shot]) - (cam.shot === 'full' ? 0.04 : 0)) / VISIBLE[cam.shot];
  const top = HEADROOM[cam.shot];
  const eyeNear = top + 0.5 * s;
  const horizon = cam.angle === 'high' ? eyeNear - 0.42 : cam.angle === 'low' ? eyeNear + 0.42 : eyeNear;
  const spread = LENS_DEPTH[cam.lens] || 1;
  const list = people.map((p, i) => {
    const at = placeOf(stage, p.id, i, people.length);
    const k = 1 / (1 + 1.2 * spread * at.d);
    const lift = at.height === 'tall' ? 0.45 : at.height === 'short' ? -0.45 : 0;
    const eye = horizon + (eyeNear - horizon) * k + (POSE_DROP[pose] - lift) * s * k;
    return {...p, ...at, k, unit: s * k, headTop: eye - 0.5 * s * k};
  });
  // nearer people are drawn last, over the ones behind
  return {cam, pose, horizon, unit: s, people: list.sort((a, b) => b.d - a.d)};
}
