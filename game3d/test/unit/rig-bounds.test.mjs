import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Issue #155 (Codex on 58ec505a): a person's skinned batch was culled by a fixed sphere round the bind pose, and
// Kuroda's briefcase swung out of it mid-stride, so the batch could vanish at the screen edge while it still showed.
// Every vertex of every person's batch, and of an outline twin, must stay inside the culling sphere in any pose.
test("people's batches and their outline twins keep every posed vertex inside their culling sphere", async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      if (specifier.startsWith('three/addons/'))
        return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  const saved = { location: globalThis.location, window: globalThis.window, document: globalThis.document,
    raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
  Object.assign(globalThis, { location: { search: '' }, window: {},
    document: { body: { classList: { contains: () => false } } },
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {} });
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { PEOPLE, walkPose, sit, armsHold, armsLap, idle } = await import('../../js/cast.js');
    const { optimizePlace } = await import('../../js/perf/batch.js');
    const { makeTwin, dropTwin } = await import('../../js/perf/batch-twin.js');
    const v = new THREE.Vector3();
    const outside = (m) => {
      let worst = -Infinity;
      for (let i = 0; i < m.geometry.index.count; i++) {
        m.getVertexPosition(m.geometry.index.getX(i), v);
        worst = Math.max(worst, v.distanceTo(m.boundingSphere.center) - m.boundingSphere.radius);
      }
      return worst;
    };
    const poses = [
      ...[0, 0.7, Math.PI / 2, Math.PI, (Math.PI * 3) / 2, 5.5].map((ph) => [`walk ${ph.toFixed(2)}`, (r) => walkPose(r, ph, 1)]),
      ['idle', (r) => idle(r, 1.3)],
      ['arms hold', (r) => armsHold(r)],
      ['arms in lap', (r) => armsLap(r)],
      ['sitting', (r) => sit(r)],
    ];
    let skinnedSeen = 0;
    for (const [name, make] of Object.entries(PEOPLE)) {
      const rig = make();
      const scene = new THREE.Scene();
      scene.add(rig.root);
      scene.updateMatrixWorld(true);
      const place = { scene, people: { r: rig } };
      const perf = optimizePlace(place, { game: { place, busy: true }, budget: 1000 });
      while (perf.busy()) await new Promise((r) => setTimeout(r, 5));
      const rigBatches = [...perf.batches].filter((b) => b.mesh.isSkinnedMesh);
      skinnedSeen += rigBatches.length;
      // the smallest batch (the briefcase on Kuroda) gets an outline twin of its own parts
      const small = rigBatches.sort((a, b) => a.parts.size - b.parts.size)[0];
      const twin = small && makeTwin(small, [...small.parts.values()]);
      for (const [pose, set] of poses) {
        set(rig);
        scene.updateMatrixWorld(true);
        perf.check();
        for (const b of rigBatches) {
          const out = outside(b.mesh);
          assert.ok(out <= 1e-4, `${name}, ${pose}: a vertex is ${out.toFixed(4)} outside its batch's culling sphere`);
        }
        if (twin) {
          const out = outside(twin);
          assert.ok(out <= 1e-4, `${name}, ${pose}: a vertex is ${out.toFixed(4)} outside its outline twin's sphere`);
        }
      }
      if (twin) dropTwin(twin);
      perf.dispose();
    }
    assert.ok(skinnedSeen > 10, 'the people merged into skinned batches');
  } finally {
    hooks.deregister();
    Object.assign(globalThis, { location: saved.location, window: saved.window, document: saved.document,
      requestAnimationFrame: saved.raf, cancelAnimationFrame: saved.caf });
  }
});
