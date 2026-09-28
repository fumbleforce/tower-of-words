// Asset list and hand-measured positions in the art (uv 0..1 unless noted as screen px).
// Only approved art is listed here. Pilot: the exterior master (art/approved/monorail-bay-ref3.png, upscaled 2x).
const ASSETS = ['c-clean', 'c-clean-d', 'c-train'];
Object.assign(P, {
  // pilot bay master, image uv: the sun's glitter path and the open water in the lower right
  bayGlitter: [[0.2, 0.31, 0.07, 0.2], [0.62, 0.7, 0.36, 0.26]],
  // sky: uv in the image (it is tilted); others: screen uv at the shot's framing
  sun: { sky: [0.5, 0.855], bay: [0.233, 0.272], forward: [0.58, 0.27], skyline: [0.57, 0.32], station: [0.62, 0.35] },
  water: { bay: [0, 640, 1920, 440], skyline: [0, 700, 1920, 380] },
  glint: { cabin: [[150, 300], [400, 330], [1500, 330], [1760, 300]], pano: [[0.5, 0.5], [0.56, 0.47], [0.62, 0.49], [0.68, 0.52]],
    skyline: [[1190, 330], [1310, 420], [1540, 460], [1000, 470]] },
  city: { bay: [0.8, 0.5], skyline: [0.62, 0.45], pano: [0.6, 0.5] },
  angle: { oncoming: 0.35 },
  face: { mc: [0.3, 0.05, 0.7, 0.42], mcwin: [0.4, 0.36], card: [0.5, 0.5] },
  reader: { gate: [0.245, 0.45] },
  copier: { copy: [0.45, 0.47] },
  button: { button: [0.5, 0.31, 960, 540] },
  pose: { mc: {}, emi: {}, mio: {}, rei: {}, aoi: {}, kaori: {} },
});
