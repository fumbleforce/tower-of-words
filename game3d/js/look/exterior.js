// World-scaled outdoor finishes. Broad structure remains at the play camera;
// the screen derivative removes fine grass/aggregate and unresolved panel joints.
// Reuses the look shader's noise and planar coordinates; no texture allocations.
export const EXTERIOR_SURFACES = `
vec3 pGrass(vec3 c){
  vec2 p = vPW.xz;
  // The light/dark lean of adjacent mower passes, with softer growth between.
  float mown = sin(p.x * 1.1 + p.y * 0.18) * 0.18;
  float growth = (pfbm(p * 0.65) - 0.5) * 0.36;
  float blade = (pn(p * vec2(24.0, 80.0)) - 0.5) * 0.17 * paa(p, 80.0) * uDetail;
  return c * (1.0 + mown + growth + blade);
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
`;
