// Asset list and hand-measured positions in the art (uv 0..1 unless noted as screen px).
const ASSETS = [
  'sky', 'bay', 'bay-d', 'oncoming', 'forward', 'forward-d', 'luggage', 'cabin', 'pano', 'pano-d', 'mcwin', 'mcwin-d', 'skyline', 'skyline-d', 'station', 'station-d',
  'gate', 'gate-d', 'towerup', 'copy', 'copy-d', 'basement', 'basement-d', 'miogame', 'miogame-d',
  'button', 'button-d', 'doors', 'doors-d', 'stairs', 'stairs-d',
  's-mc', 's-mcopen', 's-emi', 's-emi-blink', 's-mio-blink', 's-rei-blink', 's-emilaugh', 's-mio', 's-rei', 's-aoi', 's-kaori', 's-kuro',
];
Object.assign(P, {
  // sky: uv in the image (it is tilted); others: screen uv at the shot's framing
  sun: { sky: [0.5, 0.855], bay: [0.44, 0.52], forward: [0.58, 0.27], skyline: [0.57, 0.32], station: [0.62, 0.35] },
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
