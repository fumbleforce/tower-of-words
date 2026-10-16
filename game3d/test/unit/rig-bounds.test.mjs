import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Issue #155 (Codex on 58ec505a): a person's skinned batch was culled by a fixed sphere round the bind pose, and
// Kuroda's briefcase swung out of it mid-stride, so the batch could vanish at the screen edge while it still showed.
// Every vertex of every person's batch, and of an outline twin, must stay inside the culling sphere in any pose. The
// game draws no code-built people any more, so the rigs here are stand-ins (train/people.js) with plain parts on every
// pivot and a briefcase on an arm, the shape the batching (perf/batch-rig.js) handles.
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
    const { walkPose, sit, armsHold, armsLap, idle } = await import('../../js/cast.js');
    const { standIn } = await import('../../js/train/people.js');
    // three colours (clothes, skin and hair, the case), baked into one batch per person
    const mats = ['#3e4556', '#f1cfb6', '#2c2f38'].map((color) => new THREE.MeshStandardMaterial({ color }));
    const box = (w, h, d, y, k = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, y, 0), mats[k]);
      m.castShadow = true;
      return m;
    };
    // a body of plain parts on the stand-in's pivots, with a briefcase hanging from one hand in some
    const person = (i) => () => {
      const r = standIn('rig ' + i, { headK: 0.63 + i * 0.03 });
      r.hips.add(box(0.25, 0.1, 0.17, 0));
      r.torso.add(box(0.3, 0.31, 0.18, 0.15), box(0.22, 0.08, 0.02, 0.25));
      r.headK.add(box(0.45, 0.42, 0.44, 0.22, 1), box(0.47, 0.12, 0.46, 0.4, 2));
      for (const a of r.arms) a.add(box(0.09, 0.22, 0.09, -0.11), box(0.07, 0.07, 0.07, -0.26, 1));
      for (const l of r.legs) l.add(box(0.1, 0.16, 0.1, -0.08));
      for (const k of r.knees) k.add(box(0.09, 0.1, 0.09, -0.05), box(0.1, 0.05, 0.16, -0.13, 2));
      if (i % 2) r.arms[1].add(box(0.24, 0.17, 0.07, -0.37, 2), box(0.08, 0.03, 0.02, -0.28, 2));
      return r;
    };
    const PEOPLE = Object.fromEntries([0, 1, 2, 3].map((i) => ['rig' + i, person(i)]));
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
      // the smallest batch gets an outline twin of its own parts
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
    assert.ok(skinnedSeen >= Object.keys(PEOPLE).length, 'the people merged into skinned batches');
  } finally {
    hooks.deregister();
    Object.assign(globalThis, { location: saved.location, window: saved.window, document: saved.document,
      requestAnimationFrame: saved.raf, cancelAnimationFrame: saved.caf });
  }
});
