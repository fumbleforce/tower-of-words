// What kind of GPU the renderer got, from WEBGL_debug_renderer_info's name (engine.js createRenderer).
// An integrated laptop GPU shares the CPU's power and cooling: at the high tier (full AO at pixel ratio 2, uncapped
// frames) it ran flat out and the laptop got very hot (2026-10-12). 'auto' gives it the medium tier (settings.js).
//   import { gpuClass } from './perf/gpu.js';   gpuClass(name) -> { software, integrated }

// Discrete parts that share a vendor with integrated ones: Intel Arc A/B cards, AMD Radeon RX/Pro/R9 cards,
// Apple's Pro/Max/Ultra chips (integrated, but with the power and cooling of a discrete card)
const DISCRETE = /Arc\(TM\) [AB]\d|Arc [AB]\d|Radeon(\(TM\))? (RX|Pro|R9|R7|HD \d)|Apple M\d+ (Pro|Max|Ultra)/i;
const INTEGRATED = [
  /Intel/i, // HD, UHD, Iris, Iris Xe and the Meteor Lake "Arc Graphics"
  /Radeon(\(TM\))? Graphics/i, // AMD APUs: "AMD Radeon(TM) Graphics"
  /Radeon(\(TM\))? (Vega \d+|\d{3}M)\b/i, // "Radeon Vega 8 Graphics", "Radeon 780M"
  /Apple (M\d|GPU)/i, // Apple silicon (a plain M1/M2/M3 in a fanless laptop)
  /Mali|Adreno|PowerVR|Microsoft Basic Render/i,
];

export function gpuClass(name = '') {
  const software = /swiftshader|llvmpipe|software/i.test(name);
  const integrated = !software && !DISCRETE.test(name) && INTEGRATED.some((r) => r.test(name));
  return { software, integrated };
}
