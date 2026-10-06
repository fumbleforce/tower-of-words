// World-scaled outdoor finishes. Broad structure remains at the play camera;
// the screen derivative removes fine grass/aggregate and unresolved panel joints.
// Reuses the look shader's noise and planar coordinates; no texture allocations.
export const EXTERIOR_SURFACES = `
// Uneven growth and short fibres carry across the lawn without a repeated blade grid.
// Domain-warped noise breaks the rows; unresolved fibres fade at phone distance.
vec3 pGrass(vec3 c){
  vec2 p = vPW.xz;
  float mown = sin(p.x * 1.1 + p.y * 0.18) * 0.08;
  float growth = (pfbm(p * 1.8) - 0.5) * 0.40;
  float tufts = (pn(p * 8.0) - 0.5) * 0.16 * paa(p, 8.0);
  vec2 warp = vec2(pn(p * 4.0), pn(p * 3.0 + 2.7)) * 7.0;
  float fibres = (pn(p * vec2(22.0, 70.0) + warp) - 0.5) * 0.22 * paa(p, 70.0) * uDetail;
  return c * vec3(0.94, 1.09, 0.97) * (1.0 + mown + growth + tufts + fibres);
}
vec3 pAsphalt(vec3 c){
  vec2 p = vPW.xz;
  float aggregate = (pn(p * 42.0) - 0.5) * 0.16 * paa(p, 42.0) * uDetail;
  return c * (1.0 + aggregate + (pn(p * 0.8) - 0.5) * 0.055);
}
vec3 pCladding(vec3 c){
  vec2 p = pplane(vPW, vPN);
  vec2 panel = vec2(1.2, 0.6), q = p / panel;
  vec2 edge = min(fract(q), 1.0 - fract(q)) * panel;
  vec2 aa = max(fwidth(p), vec2(0.001));
  vec2 joint = 1.0 - smoothstep(vec2(0.006), vec2(0.006) + aa, edge);
  float resolved = paa(p, 1.0 / panel.y);
  float shade = 1.0 + (ph(floor(q) + 8.2) - 0.5) * 0.085 * resolved;
  float seam = 1.0 - max(joint.x, joint.y) * 0.28 * resolved;
  return c * shade * seam * (1.0 + (pn(p * 7.0) - 0.5) * 0.035 * paa(p, 7.0));
}

// Small overlapping leaves over a broader canopy, while retaining its modelled facets.
vec3 pFoliage(vec3 c){
  vec2 p = pplane(vPW, vPN);
  vec2 q = p * 7.0 + vec2(pn(p * 1.3), pn(p * 1.7 + 6.2)) * 4.0;
  q.x += floor(q.y) * 0.5;
  vec2 cell = floor(q), f = fract(q) - 0.5;
  float r = ph(cell + 2.3);
  f.x += f.y * (r - 0.5);
  float leaf = 1.0 - smoothstep(0.19, 0.37 + length(fwidth(q)), length(f * vec2(1.0, 1.7)));
  float resolved = paa(p, 7.0) * uDetail;
  float cluster = (pfbm(p * 2.1) - 0.5) * 0.30;
  float leaves = ((leaf - 0.22) * 0.22 + (r - 0.5) * 0.12) * resolved;
  return c * (1.0 + cluster + leaves);
}
vec3 pBark(vec3 c){
  vec2 p = pplane(vPW, vPN);
  vec2 q = vec2(p.x * 18.0, vPW.y * 1.8);
  float ridge = pn(q + vec2(pn(q * 0.23) * 0.7, 0.0));
  float grain = (ridge - 0.5) * 0.30 * paa(p, 18.0) * uDetail;
  return c * (1.0 + grain + (pn(p * 2.0) - 0.5) * 0.12);
}
// Flat roofs use lapped membrane rolls, not the facade's cladding grid.
vec3 pRoof(vec3 c){
  vec2 p = vPW.xz, q = p / vec2(1.2, 3.6);
  float aa = max(fwidth(p.x), 0.001);
  float edge = min(fract(q.x), 1.0 - fract(q.x)) * 1.2;
  float seam = (1.0 - smoothstep(0.012, 0.012 + aa, edge)) * paa(p, 0.84);
  float roll = (ph(floor(q) + 4.5) - 0.5) * 0.12;
  return c * (1.0 + roll - seam * 0.28 + (pn(p * 5.0) - 0.5) * 0.05 * paa(p, 5.0));
}
// Distant shared paths continue the laid blocks of the detailed outdoor kit.
vec3 pPaving(vec3 c){
  vec2 p = vPW.xz, q = p / vec2(0.72, 0.36);
  q.x += mod(floor(q.y), 2.0) * 0.5;
  vec2 e = min(fract(q), 1.0 - fract(q)) * vec2(0.72, 0.36);
  vec2 aa = max(fwidth(p), vec2(0.001));
  vec2 joints = 1.0 - smoothstep(vec2(0.008), vec2(0.008) + aa, e);
  float resolved = paa(p, 2.8);
  float shade = (ph(floor(q) + 9.1) - 0.5) * 0.17 * resolved;
  return c * (1.0 + shade - max(joints.x, joints.y) * 0.22 * resolved);
}
`;
