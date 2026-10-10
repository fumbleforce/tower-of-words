// In-page measurement for the place budget check (place-budget.mjs): one place, opened on its own, from fixed cameras.
// Everything here runs in the browser page through page.evaluate, so it may only use what the page has.

// Draw calls and triangles of whole frames (every pass), one sample per animation frame, as tools/perf/scene-probe.mjs.
export function sampleFrames(count) {
  const g = globalThis.__game, info = g.renderer.info;
  const calls = [], tris = [];
  globalThis.__perfHold = true;
  info.autoReset = false;
  const next = () => new Promise(resolve => globalThis.requestAnimationFrame(resolve));
  return (async () => {
    try {
      await next();
      for (let i = 0; i < count; i++) {
        info.reset();
        await next();
        calls.push(info.render.calls); tris.push(info.render.triangles);
      }
    } finally { info.autoReset = true; globalThis.__perfHold = false; }
    const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    return { calls: median(calls), tris: median(tris) };
  })();
}

// What the place holds in GPU memory: every geometry and texture its scene graph reaches, each counted once. Render
// targets (shadow map, post-processing) are left out: they depend on the screen, not on the place.
export function sceneMemory() {
  const g = globalThis.__game, scene = g.place.scene;
  const arrays = new Set(), sources = new Map();
  let geometries = 0;
  const seenGeo = new Set();
  const addAttr = attr => { if (attr) arrays.add(attr.isInterleavedBufferAttribute ? attr.data.array : attr.array); };
  const addTex = tex => {
    if (!tex?.isTexture || tex.isRenderTargetTexture) return;
    const src = tex.source || tex, image = src.data || tex.image;
    if (sources.has(src) || !image) return;
    const w = image.width || 0, h = image.height || 0, d = image.depth || 1;
    let bytes = 0;
    if (tex.isCompressedTexture && tex.mipmaps?.length) bytes = tex.mipmaps.reduce((s, m) => s + (m.data?.byteLength || 0), 0);
    else if (tex.isCubeTexture && Array.isArray(tex.image)) bytes = tex.image.reduce((s, i) => s + (i?.width || 0) * (i?.height || 0) * 4, 0);
    else bytes = w * h * d * 4;
    if (tex.generateMipmaps && !tex.isCompressedTexture) bytes = Math.round(bytes * 4 / 3);
    sources.set(src, bytes);
  };
  const addMaterial = m => {
    if (!m) return;
    for (const v of Object.values(m)) addTex(v);
    if (m.uniforms) for (const u of Object.values(m.uniforms)) addTex(u?.value);
  };
  scene.traverse(o => {
    const geo = o.geometry;
    // a mesh the draw-call pass merged, whose own GPU copy it let go (js/perf/batch.js, freeHidden): its batch counts
    if (geo?.userData?.perfFreed && o.layers.mask === 1 << 31) return;
    if (geo && !seenGeo.has(geo)) {
      seenGeo.add(geo); geometries++;
      for (const a of Object.values(geo.attributes || {})) addAttr(a);
      for (const list of Object.values(geo.morphAttributes || {})) for (const a of list) addAttr(a);
      addAttr(geo.index);
    }
    for (const m of [o.material].flat()) addMaterial(m);
  });
  addTex(scene.background); addTex(scene.environment);
  let geoBytes = 0;
  for (const a of arrays) geoBytes += a?.byteLength || 0;
  let texBytes = 0;
  for (const b of sources.values()) texBytes += b;
  const mb = b => Math.round(b / 1e5) / 10;
  return { geoMB: mb(geoBytes), texMB: mb(texBytes), geometries, textures: sources.size };
}

// Turn the third-person camera by a mouse movement, as a captured mouse would (camera/controls.js). The pointer lock
// is faked for this page only: a headless browser can't take a real one.
export function look(dx, dy) {
  const canvas = globalThis.__game.renderer.domElement;
  globalThis.__fakePointerLock = canvas;
  globalThis.dispatchEvent(new globalThis.MouseEvent('mousemove', { movementX: dx, movementY: dy }));
}
