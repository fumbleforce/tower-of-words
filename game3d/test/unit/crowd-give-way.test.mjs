import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Issue #198 (Codex X-0446 on 809a977d): a passer-by stepping aside for someone gliding through (Eric on a scripted
// glide) was pushed after the body-collision pass, so the step aside could put them inside a fixed actor standing
// next to them. Eric at (0,0) glides +z; the walker at (0.5,0) heads for (0.5,3); staff stands fixed at (1,0).
async function run(withStaff) {
  const vendor = new URL('../../vendor/three/three.module.js', import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return { url: vendor, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      // the walk pose isn't under test; the real people.js builds meshes
      if (url.endsWith('/js/train/people.js'))
        return { format: 'module', source: 'export const HIP = 0.7; export function walkPose() {}', shortCircuit: true };
      return next(url, context);
    },
  });
  const saved = globalThis.window;
  globalThis.window = {};
  try {
    const THREE = await import(vendor);
    const { walkStep } = await import('../../js/crowd/motion.js');
    const { bodies } = await import('../../js/movement/shared.js');
    const { softSeparate } = await import('../../js/movement/crowd.js');
    const { Nav } = await import('../../js/movement/navigation.js');
    const rig = (x, z, ambient = false) => {
      const r = { root: new THREE.Group(), ambient };
      r.root.position.set(x, 0, z);
      return r;
    };
    const eric = rig(0, 0),
      walker = rig(0.5, 0, true),
      staff = rig(1, 0);
    Object.assign(eric, { _walk: true, _noAvoid: true });
    staff._noAvoid = true;
    staff.root.visible = withStaff;
    eric.root.userData.walkVel = [0, 0.2];
    const space = new THREE.Group();
    space.add(eric.root, walker.root, staff.root);
    const game = {
      t: 0,
      player: eric,
      place: { space, charScale: 1, nav: new Nav(-4, 4, -4, 4), crowd: [walker], people: { staff } },
    };
    const w = { r: walker, line: [[0.5, 3]], i: 0, speed: 1, onGrid: true };
    let closest = Infinity,
      overlaps = 0,
      eclosest = Infinity;
    for (let i = 0; i < 30; i++) {
      const list = bodies(game);
      walkStep(game, w, 0.05, list, list.find((b) => b.id === 'eric'), 0);
      game.t += 0.05;
      softSeparate(game, 0.05);
      const d = walker.root.position.distanceTo(staff.root.position);
      closest = Math.min(closest, d);
      if (d < 0.48 - 1e-6) overlaps++;
      eclosest = Math.min(eclosest, walker.root.position.distanceTo(eric.root.position));
      eric.root.position.z += 0.01;
    }
    return { overlaps, closest, eclosest, x: walker.root.position.x };
  } finally {
    globalThis.window = saved;
    hooks.deregister();
  }
}

test('a passer-by giving way to a glide never steps into a fixed actor', async () => {
  const { overlaps, closest, eclosest } = await run(true);
  assert.equal(overlaps, 0, `walker overlapped the staff on ${overlaps} frames (closest ${closest.toFixed(3)} < 0.48)`);
  assert.ok(eclosest >= 0.48 - 1e-6, `walker overlapped Eric (closest ${eclosest.toFixed(3)})`);
});

test("with nobody beside them, a passer-by still steps out of the glide's way", async () => {
  const { x } = await run(false);
  assert.ok(x > 0.6, `walker stayed in Eric's way (x ${x.toFixed(3)})`);
});
