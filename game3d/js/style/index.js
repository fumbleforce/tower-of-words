// Style study: looks for the whole world, picked with ?style=1..8 (no flag, or ?style=0, is the current look).
// Reference: art/refs/style-target-kuro-pose-s202.webp (our anime art): dark ink lines of varying weight, cel
// shading with two or three hard tones, deep navy and slate shadows, cool palette with warm skin, bright window light,
// sparse line detail. Each style sets:
//   toon   cel shading in every lit material (style/toon.js)
//   ink    outline post pass (style/ink.js), or null
//   final  palette mapping and grain in the final pass (post.js)
//   grade  overrides on the place's grade; *Mul keys multiply the place's value instead
// Tune live in the console: window.__style.toon.U / window.__style.ink.set({...}) / window.__style.post.setGrade({...})

const NAVY = [0.03, 0.042, 0.085]; // display-space palette stops for the palette map
const SLATE = [0.2, 0.25, 0.34];
const COOL = [0.66, 0.71, 0.79];
const PAPER = [0.96, 0.955, 0.94];

export const STYLES = {
  1: {
    name: 'Soft cel',
    note: 'Three soft-edged tones per material, shadows pulled toward navy. No lines. The closest to today.',
    toon: {
      uSStep: 1.25,
      uSSoft: 3.0,
      uSKeep: 1.0,
      uSHard: 0.6,
      uSTint: 0.4,
      uSShadow: [0.6, 0.66, 0.92],
      uSDark: [0.2, 0.7],
    },
    ink: null,
    final: { pal: 0.0, grain: 0.0 },
    grade: { aoMul: 0.7 },
  },
  2: {
    name: 'Clean cel, fine line',
    note: 'Hard two-to-three tone cel shading and a thin soft ink line on silhouettes and creases.',
    toon: {
      uSStep: 1.2,
      uSSoft: 1.5,
      uSKeep: 0.5,
      uSHard: 1.0,
      uSTint: 0.6,
      uSShadow: [0.55, 0.62, 0.95],
      uSDark: [0.2, 0.7],
    },
    ink: { uSil: 1.2, uSilChar: 1.6, uCrease: 0.8, uSilT: 0.03, uCreaseT: 0.3, uIdOn: 0, uStrength: 0.6, uTone: 0.55 },
    final: { pal: 0.0, grain: 0.0 },
    grade: { aoMul: 0.5, blurMul: 0.6 },
  },
  3: {
    name: 'Anime key',
    note: 'Aimed at the reference: hard cel with navy shadows, dark ink of varying weight (heavy silhouettes, lighter creases and colour edges), a cool restrained palette and a rim of window light.',
    toon: {
      uSStep: 1.0,
      uSSoft: 1.0,
      uSKeep: 0.35,
      uSHard: 1.0,
      uSTint: 0.9,
      uSShadow: [0.38, 0.46, 0.9],
      uSDark: [0.2, 0.7],
      uSRim: 0.25,
    },
    ink: {
      uSil: 2.0,
      uSilChar: 3.0,
      uCrease: 1.0,
      uSilT: 0.02,
      uCreaseT: 0.25,
      uIdOn: 1,
      uStrength: 0.95,
      uTone: 0.2,
      uWobble: 0.25,
    },
    final: { pal: 0.35, grain: 0.0 },
    grade: { aoMul: 0.35, blurMul: 0.4, satMul: 0.9, contrastMul: 1.04 },
  },
  4: {
    name: 'Ink and hatching',
    note: 'Style 3 plus sparse hatching in the shadow band, faint brushed texture on big surfaces and film grain.',
    toon: {
      uSStep: 1.0,
      uSSoft: 1.0,
      uSKeep: 0.35,
      uSHard: 1.0,
      uSTint: 0.85,
      uSShadow: [0.42, 0.5, 0.9],
      uSDark: [0.2, 0.7],
      uSRim: 0.25,
      uSHatch: 0.55,
      uSHatchScale: 11,
      uSBrush: 0.1,
    },
    ink: {
      uSil: 2.0,
      uSilChar: 3.0,
      uCrease: 1.0,
      uSilT: 0.02,
      uCreaseT: 0.25,
      uIdOn: 1,
      uStrength: 0.95,
      uTone: 0.2,
      uWobble: 0.4,
    },
    final: { pal: 0.35, grain: 0.035 },
    grade: { aoMul: 0.35, blurMul: 0.4, satMul: 0.9, contrastMul: 1.04 },
  },
  5: {
    name: 'Bold graphic',
    note: 'Two tones only, heavy ink, strong palette map to navy, slate and white, a hard rim light. The loudest.',
    toon: {
      uSStep: 1.6,
      uSSoft: 0.8,
      uSKeep: 0.0,
      uSHard: 1.0,
      uSPool: 1.0,
      uSTint: 1.0,
      uSShadow: [0.5, 0.56, 0.92],
      uSDark: [0.25, 0.8],
      uSRim: 0.45,
    },
    ink: {
      uSil: 2.6,
      uSilChar: 3.6,
      uCrease: 1.5,
      uSilT: 0.02,
      uCreaseT: 0.22,
      uIdOn: 1,
      uStrength: 1.0,
      uTone: 0.0,
      uWobble: 0.3,
    },
    final: { pal: 0.45, grain: 0.02 },
    grade: { aoMul: 0.2, blurMul: 0.2, satMul: 0.78, contrastMul: 1.1 },
  },
  6: {
    name: 'Painted cel',
    note: 'Cel tones with brushed texture and coloured line art (lines a dark shade of the colour under them, not black), palette map and grain.',
    toon: {
      uSStep: 1.0,
      uSSoft: 2.0,
      uSKeep: 0.6,
      uSHard: 0.85,
      uSTint: 0.8,
      uSShadow: [0.45, 0.52, 0.9],
      uSDark: [0.2, 0.7],
      uSRim: 0.3,
      uSBrush: 0.16,
    },
    ink: {
      uSil: 1.6,
      uSilChar: 2.4,
      uCrease: 1.0,
      uSilT: 0.025,
      uCreaseT: 0.3,
      uIdOn: 0,
      uStrength: 0.85,
      uTone: 1.0,
      uWobble: 0.3,
    },
    final: { pal: 0.35, grain: 0.045 },
    grade: { aoMul: 0.4, blurMul: 0.5, satMul: 0.92 },
  },
  7: {
    name: 'Painted cel, lighter',
    note: 'Style 6 with a thinner, fainter coloured line, less brush texture and a gentler palette map.',
    toon: {
      uSStep: 1.0,
      uSSoft: 2.0,
      uSKeep: 0.7,
      uSHard: 0.85,
      uSTint: 0.75,
      uSShadow: [0.48, 0.55, 0.9],
      uSDark: [0.2, 0.7],
      uSRim: 0.25,
      uSBrush: 0.1,
    },
    ink: {
      uSil: 1.1,
      uSilChar: 1.8,
      uCrease: 0.8,
      uSilT: 0.03,
      uCreaseT: 0.35,
      uIdOn: 0,
      uStrength: 0.65,
      uTone: 1.0,
      uWobble: 0.3,
    },
    final: { pal: 0.25, grain: 0.03 },
    grade: { aoMul: 0.45, blurMul: 0.5, satMul: 0.92 },
  },
  8: {
    name: 'Painted cel, heavier',
    note: 'Style 6 with a heavier, darker line (still tinted by the colour under it), more brush texture, harder light and a stronger palette map.',
    toon: {
      uSStep: 1.0,
      uSSoft: 1.5,
      uSKeep: 0.45,
      uSHard: 1.0,
      uSTint: 0.85,
      uSShadow: [0.42, 0.5, 0.9],
      uSDark: [0.2, 0.7],
      uSRim: 0.3,
      uSBrush: 0.24,
    },
    ink: {
      uSil: 2.2,
      uSilChar: 3.2,
      uCrease: 1.2,
      uSilT: 0.02,
      uCreaseT: 0.27,
      uIdOn: 1,
      uStrength: 0.95,
      uTone: 0.7,
      uWobble: 0.35,
    },
    final: { pal: 0.4, grain: 0.05 },
    grade: { aoMul: 0.35, blurMul: 0.4, satMul: 0.9 },
  },
};

export const PALETTE = [NAVY, SLATE, COOL, PAPER];

export function styleId() {
  const q = new URLSearchParams(location.search);
  const v = q.has('style') ? +q.get('style') : window.__styleId || 0;
  return STYLES[v] ? v : 0;
}
export function currentStyle() {
  const id = styleId();
  return id ? { id, ...STYLES[id] } : null;
}

// the place's grade with a style's overrides applied
export function styleGrade(g, s) {
  if (!s || !s.grade) return g;
  const out = { ...g };
  for (const [k, v] of Object.entries(s.grade)) {
    if (k.endsWith('Mul')) {
      const key = k.slice(0, -3);
      out[key] = (out[key] ?? 1) * v;
    } else out[k] = v;
  }
  return out;
}
