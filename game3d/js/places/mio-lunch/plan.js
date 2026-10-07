// Existing B2 tape crates and rack positions. The adapter shares these with day 1's lunch.
export const LUNCH_TOP = 0.24;
export const LUNCH_SEATS = {
  eric: { x: 4.45, z: -2.3, ry: Math.PI / 2, walk: [4.75, -1.8] },
  mio: { x: 5.95, z: -2.3, ry: -Math.PI / 2, walk: [5.95, -1.8] },
};
export const LUNCH_PLAN = {
  intake: [5.12, 0.48, -2.945],
  inspect: [5.12, -2.55],
  handover: { player: [5.1, -1.8], mio: [5.8, -1.8] },
  // The canonical machine doorway is x4.7..5.5. Both directions use the same corridor.
  doorApproach: [5.0, -0.75],
  door: [5.0, 0.8],
  corridor: [5.0, 1.35],
  lobby: [-5.45, 1.35],
  exit: [-5.45, -2.8],
  cable: [4.34, 0.27, -2.17],
  cableHook: [4.34, 0.225, -2.09],
  sheet: [4.45, 0.246, -2.3],
  sheetRack: [5.12, 0.85, -2.935],
  sheetApproach: [5.12, -2.61],
};
