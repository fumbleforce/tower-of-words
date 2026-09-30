// What the draw-call pass (perf/batch.js) compares: a material's look as a key (meshes with the same key can share a
// batch) and snapshots of materials, nodes and meshes that its per-frame watch checks without allocating.
const TEX = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
  'gradientMap',
  'matcap',
  'clearcoatMap',
  'sheenColorMap',
  'transmissionMap',
  'iridescenceMap',
  'anisotropyMap',
  'specularColorMap',
  'specularIntensityMap',
  'thicknessMap',
];

const col = (c) => (c ? [c.r, c.g, c.b] : null);
// everything about a material that changes its look, except the colour (baked into vertices when allowed)
export function matKey(m, withColor) {
  const k = [
    m.type,
    m.side,
    m.transparent,
    m.opacity,
    m.depthWrite,
    m.depthTest,
    m.colorWrite,
    m.alphaTest,
    m.blending,
    m.fog,
    m.toneMapped,
    m.polygonOffset,
    m.polygonOffsetFactor,
    m.polygonOffsetUnits,
    m.wireframe,
    m.dithering,
    m.flatShading,
    m.vertexColors,
    m.visible,
    m.premultipliedAlpha,
    m.alphaToCoverage,
    m.forceSinglePass,
    m.stencilWrite,
    m.shadowSide,
    col(m.emissive),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.shininess,
    col(m.specular),
    m.reflectivity,
    m.envMapIntensity,
    m.lightMapIntensity,
    m.aoMapIntensity,
    m.bumpScale,
    m.normalScale && [m.normalScale.x, m.normalScale.y],
    m.displacementScale,
    m.clearcoat,
    m.clearcoatRoughness,
    m.sheen,
    m.transmission,
    m.ior,
    m.thickness,
    m.iridescence,
    m.anisotropy,
    col(m.sheenColor),
    col(m.attenuationColor),
    m.combine,
    m.refractionRatio,
    m.clippingPlanes ? 'clip' : 0,
    m.defines ? JSON.stringify(m.defines) : 0,
    JSON.stringify(m.userData),
  ];
  for (const t of TEX) if (m[t]) k.push(t + ':' + m[t].uuid);
  if (withColor) k.push(col(m.color));
  return JSON.stringify(k);
}
export const hasTex = (m) => TEX.some((t) => m[t]);
// a material whose userData says nothing but that the look patched it (look/procedural.js) can have its colour baked
// into vertex colours: the patch works on diffuseColor after the vertex colours are in, so the numbers are the same
export const plainData = (m) => Object.keys(m.userData).every((k) => k === 'look');
// what the watch compares every frame (a change sends the mesh back to drawing itself); no allocations per frame
export function matSnap(m) {
  const c = m.color,
    e = m.emissive;
  return {
    cr: c ? c.r : 0,
    cg: c ? c.g : 0,
    cb: c ? c.b : 0,
    er: e ? e.r : 0,
    eg: e ? e.g : 0,
    eb: e ? e.b : 0,
    ei: m.emissiveIntensity,
    op: m.opacity,
    tr: m.transparent,
    vi: m.visible,
    si: m.side,
    dw: m.depthWrite,
    dt: m.depthTest,
    cw: m.colorWrite,
    cl: m.clippingPlanes ? m.clippingPlanes.length : -1,
    map: m.map,
    em: m.emissiveMap,
    at: m.alphaTest,
    ro: m.roughness,
    me: m.metalness,
    wf: m.wireframe,
    bl: m.blending,
  };
}
export function matSame(m, s) {
  const c = m.color,
    e = m.emissive;
  if (c && (c.r !== s.cr || c.g !== s.cg || c.b !== s.cb)) return false;
  if (e && (e.r !== s.er || e.g !== s.eg || e.b !== s.eb)) return false;
  return (
    m.emissiveIntensity === s.ei &&
    m.opacity === s.op &&
    m.transparent === s.tr &&
    m.visible === s.vi &&
    m.side === s.si &&
    m.depthWrite === s.dw &&
    m.depthTest === s.dt &&
    m.colorWrite === s.cw &&
    (m.clippingPlanes ? m.clippingPlanes.length : -1) === s.cl &&
    m.map === s.map &&
    m.emissiveMap === s.em &&
    m.alphaTest === s.at &&
    m.roughness === s.ro &&
    m.metalness === s.me &&
    m.wireframe === s.wf &&
    m.blending === s.bl
  );
}
export function nodeSnap(o) {
  const p = o.position,
    q = o.quaternion,
    c = o.scale;
  return {
    px: p.x,
    py: p.y,
    pz: p.z,
    qx: q.x,
    qy: q.y,
    qz: q.z,
    qw: q.w,
    sx: c.x,
    sy: c.y,
    sz: c.z,
    v: o.visible,
    par: o.parent,
    au: o.matrixAutoUpdate,
    me: o.matrixAutoUpdate ? null : o.matrix.elements.slice(),
  };
}
export function nodeSame(o, s) {
  const p = o.position,
    q = o.quaternion,
    c = o.scale;
  if (
    p.x !== s.px ||
    p.y !== s.py ||
    p.z !== s.pz ||
    q.x !== s.qx ||
    q.y !== s.qy ||
    q.z !== s.qz ||
    q.w !== s.qw ||
    c.x !== s.sx ||
    c.y !== s.sy ||
    c.z !== s.sz
  )
    return false;
  if (o.visible !== s.v || o.parent !== s.par || o.matrixAutoUpdate !== s.au) return false;
  if (s.me) {
    const e = o.matrix.elements;
    for (let i = 0; i < 16; i++) if (e[i] !== s.me[i]) return false;
  }
  return true;
}
export function srcSnap(o) {
  const g = o.geometry,
    a = g.attributes;
  return {
    m: o.material,
    g,
    pv: a.position.version,
    nv: a.normal ? a.normal.version : -1,
    uv: a.uv ? a.uv.version : -1,
    cv: a.color ? a.color.version : -1,
    iv: g.index ? g.index.version : -1,
    cs: o.castShadow,
    rs: o.receiveShadow,
    ro: o.renderOrder,
    fc: o.frustumCulled,
  };
}
export function srcSame(o, s) {
  const g = o.geometry;
  if (o.material !== s.m || g !== s.g) return false;
  const a = g.attributes;
  return (
    a.position.version === s.pv &&
    (a.normal ? a.normal.version : -1) === s.nv &&
    (a.uv ? a.uv.version : -1) === s.uv &&
    (a.color ? a.color.version : -1) === s.cv &&
    (g.index ? g.index.version : -1) === s.iv &&
    o.castShadow === s.cs &&
    o.receiveShadow === s.rs &&
    o.renderOrder === s.ro &&
    o.frustumCulled === s.fc
  );
}
