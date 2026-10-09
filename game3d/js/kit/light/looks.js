// The period table: what each period of the day looks like, in one place (notes/lighting-system.md). A period
// (sim.js PERIODS) falls in a phase, and a phase has a look: the sky and ground light, the sun's direction and
// colour, the fill, the colour grade (post.js GRADE), whether lamps and lit windows glow, and outdoors the sky
// behind it all (look/sky.js paints it). Places pick a set of looks (OUTDOOR, DORM) and may patch it; they never
// write their own light values per period. Plain data: no three.js here.
//
//   phaseOf(period)                         'day' or 'dusk'
//   lookFor(looks, phase, day, period)      one phase's look, with a later day's own values on top (`days`) and a
//                                           period's own on top of those (`periods`: the early morning's sky)

// every period the days use, and its phase. A new period (a night) is one line here and one look per set.
export const PHASE = { early: 'day', morning: 'day', lunch: 'day', afternoon: 'day', evening: 'dusk' };
export const phaseOf = (period) => PHASE[period] || 'day';

export function lookFor(looks, phase, day = 1, period) {
  let L = looks[phase] || looks.day;
  if (L.days?.[day]) L = { ...L, ...L.days[day] };
  return L.periods?.[period] ? { ...L, ...L.periods[period] } : L;
}

// where the sun shines from, morning and after work; outdoor/shade.js lays the shadows outside a place's shadow
// box along the same directions
export const SUN = { morning: [0.8, 0.52, -0.3], evening: [-0.85, 0.34, 0.25] };

// the morning's grade on the outdoor chunks (the forecourt, the plaza, the shop street, the east lane)
export const MORNING_GRADE = {
  exposure: 1.04,
  temp: 0.025,
  sat: 0.78,
  contrast: 1.04,
  lift: [0.012, 0.012, 0.018],
  shadowTint: [-0.008, -0.002, 0.02],
  highTint: [0.022, 0.01, -0.014],
  vignette: 0.2,
  bloom: 0.3,
  bloomThreshold: 0.82,
  focusBand: 0.3,
};
// after work: dusk outdoors, so the walk home is in one light: a dim blue sky, the last of the sun low and orange
// from the west, lamps and windows glowing
export const EVENING_GRADE = {
  exposure: 0.98,
  temp: -0.02,
  sat: 0.78,
  contrast: 1.06,
  lift: [0.008, 0.01, 0.026],
  shadowTint: [-0.016, 0, 0.036],
  highTint: [0.03, 0.012, -0.016],
  vignette: 0.3,
  bloom: 0.42,
  bloomThreshold: 0.72,
  focusBand: 0.3,
};
// day 2's after work (story/day2/): the same dusk lifted, so faces and paths read on a phone screen, the lamps still
// warm and the sky still dusk; day 1's evening stays as it is. charLift: the people's own colours added back a little
// with a rim of sky light (look/char-lift.js), so dark clothes keep their shape against the dusk
export const EVENING_GRADE_2 = {
  ...EVENING_GRADE,
  exposure: 1.18,
  sat: 0.86,
  contrast: 1.04,
  lift: [0.01, 0.012, 0.03],
  vignette: 0.22,
  charLift: 0.13,
};
export const eveningGrade = (day = 1) => (day === 2 ? EVENING_GRADE_2 : EVENING_GRADE);
// the evening's lights per day. pool: the gain on the street lamps' pools (outdoor/furniture.js lightSet), up on
// day 2 so they hold against its brighter dusk
export const EVENING_LIGHT = {
  1: { sky: ['#8d9bb8', '#454850', 1.2], sun: ['#ffa56e', 1.45], fill: ['#b4c2ee', 0.4], pool: 1 },
  2: { sky: ['#8fa2d4', '#5c5e6a', 1.75], sun: ['#ffa062', 2.1], fill: ['#c4cff4', 1.35], pool: 2 },
};

// the sky outdoors (sRGB; look/sky.js paints it, and the far view's haze takes the horizon's colour): zenith, the
// sky a third of the way up, the horizon, the glow round the sun and how strong it is, the mainland's hills on the
// horizon. early: the low morning sun before work; day: the rest of the working day; dusk: after work
export const SKY = {
  early: { zenith: '#6c8fbb', mid: '#9cb3cb', horizon: '#c4c8c8', glow: '#f6d6a8', glowK: 0.5, land: '#98a1a8' },
  day: { zenith: '#5f89ba', mid: '#93b0cd', horizon: '#bccad4', glow: '#fbeccd', glowK: 0.3, land: '#93a2ad' },
  dusk: { zenith: '#3f4f7a', mid: '#7b809f', horizon: '#b2a0a6', glow: '#ff9d5e', glowK: 0.85, land: '#7f7a8a' },
};

// outdoors. hemi: [sky, ground, intensity]; sun: [colour, intensity, direction]; fill: [colour, intensity];
// glow: lamps, lit windows and signs on; pool: the lamps' pool gain; sky: the sky behind (SKY)
const duskLook = (day, grade) => {
  const L = EVENING_LIGHT[day];
  return { hemi: L.sky, sun: [...L.sun, SUN.evening], fill: L.fill, pool: L.pool, grade };
};
export const OUTDOOR = {
  day: {
    hemi: ['#b7c1d2', '#6a625c', 1.7],
    sun: ['#ffc990', 3.2, SUN.morning],
    fill: ['#dfe7ff', 0.6],
    grade: MORNING_GRADE,
    glow: false,
    sky: SKY.day,
    periods: { early: { sky: SKY.early } },
  },
  dusk: {
    ...duskLook(1, EVENING_GRADE),
    glow: true,
    sky: SKY.dusk,
    days: { 2: duskLook(2, EVENING_GRADE_2) },
  },
};

// the same set with the sun from other directions per phase, on every day's look too: a chunk turned on the island
export function sunFrom(looks, dirs) {
  const turn = (L, d) => (L.sun ? { ...L, sun: [L.sun[0], L.sun[1], d] } : L);
  const out = {};
  for (const [phase, L] of Object.entries(looks)) {
    const d = dirs[phase];
    out[phase] = d ? turn(L, d) : L;
    if (d && L.days) out[phase].days = Object.fromEntries(Object.entries(L.days).map(([day, v]) => [day, turn(v, d)]));
  }
  return out;
}

// the fountain plaza: day 2's dusk with its many overlapping lamp pools turned down a little (1.5 for the streets'
// 2) and its exposure eased back, as its open paving takes more of the sky than the streets do
export const PLAZA = {
  ...OUTDOOR,
  dusk: {
    ...OUTDOOR.dusk,
    days: { 2: { ...OUTDOOR.dusk.days[2], pool: 1.5, grade: { ...EVENING_GRADE_2, exposure: 1.08 } } },
  },
};

// the shop street (scenes/shotengai.js): its chunk is turned, local north is island west. Mornings the sun comes
// from the east-south-east over the camera's left shoulder; after work low in the west, ahead down the street
export const SHOTENGAI = sunFrom(OUTDOOR, { day: [-0.45, 0.62, 0.64], dusk: [0.18, 0.3, -0.94] });

// the dorm courtyard (scenes/dorm-court.js): it lies in the blocks' morning shade, so by day more of the sky's light
// reads as day; after work, dusk after the sun has gone behind the blocks: a cool sky over everything, the last warm
// light from the west high enough that the blocks' shadows stay short (the sky's glow stays where the town's dusk
// sun is: skyDir), a soft fill from the camera side. The lamps, windows and machines do the rest. bg: the background
// where there is no sky picture (?far=0)
export const DORM_COURT = {
  day: { ...OUTDOOR.day, hemi: [OUTDOOR.day.hemi[0], OUTDOOR.day.hemi[1], 2.3], bg: '#5d636c' },
  dusk: {
    hemi: ['#a4b0cf', '#565862', 1.4],
    sun: ['#ffbf94', 1.05, [-0.62, 0.68, 0.39]],
    fill: ['#bcc8f0', 0.5],
    pool: 1,
    grade: EVENING_GRADE,
    glow: true,
    sky: SKY.dusk,
    skyDir: SUN.evening,
    bg: '#2b3342',
    days: { 2: { grade: EVENING_GRADE_2 } },
  },
};

// the dorm building (scenes/dorms.js): a dim cool dusk through the windows after work, daylight from the sky in
// the morning (day 2 starts here); the room's own lamps stay on in both. bg: the scene's background
export const DORM_NIGHT_GRADE = {
  exposure: 1.0,
  temp: -0.02,
  sat: 0.74,
  contrast: 1.05,
  lift: [0.01, 0.012, 0.022],
  shadowTint: [-0.01, 0, 0.025],
  highTint: [0.02, 0.008, -0.012],
  vignette: 0.26,
  bloom: 0.32,
  bloomThreshold: 0.8,
  focusBand: 0.3,
};
export const DORM = {
  day: {
    hemi: ['#d6e0ee', '#6f6a62', 1.55],
    sun: ['#fff0dc', 0.95, [-0.3, 1, 0.55]],
    bg: '#39414e',
    grade: { ...DORM_NIGHT_GRADE, exposure: 1.06, temp: 0.01, sat: 0.8, vignette: 0.22 },
    glow: false,
  },
  dusk: {
    hemi: ['#8e9cb6', '#3a3f4b', 1.05],
    sun: ['#b8c6e0', 0.55, [-0.3, 1, 0.55]],
    bg: '#1b1f26',
    grade: DORM_NIGHT_GRADE,
    glow: true,
  },
};
