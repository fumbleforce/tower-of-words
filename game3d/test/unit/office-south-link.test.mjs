import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({
  resolve(s, c, next) {
    return next(
      s === 'three'
        ? new URL('../../vendor/three/three.module.js', import.meta.url).href
        : s.startsWith('three/addons/')
          ? new URL('../../vendor/' + s.slice(13), import.meta.url).href
          : s,
      c,
    );
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const { southLinkFrame } = await import('../../js/scenes/forecourt/south-link.js');
const { toIsland, PATHS, CHUNKS } = await import('../../js/scenes/island-layout.js');
const { OFFICE_SOUTH_LINK, LINKS } = await import('../../js/scenes/island-south.js');
const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-8);
test('both directions meet at one island position and arrive clear of their exit zones', () => {
  for (const place of ['forecourt', 'shotengai']) {
    const f = southLinkFrame(place),
      [x0, x1, z0, z1] = CHUNKS[place].walk;
    assert.ok(close(toIsland(place, ...f.edge), [OFFICE_SOUTH_LINK.x, OFFICE_SOUTH_LINK.seam]));
    assert.ok(!f.exit(...f.inside));
    assert.ok(!f.exit(...f.lane));
    assert.ok(f.exit(...f.edge));
    for (const p of [f.edge, f.inside, f.lane]) assert.ok(p[0] > x0 && p[0] < x1 && p[1] > z0 && p[1] < z1);
  }
  const road = PATHS.find((p) => p.id === 'office_south_walk').rect;
  assert.ok(Math.abs(road[3] - LINKS.west[1]) < 1e-8);
  assert.equal(road[0], LINKS.west[0]);
  assert.equal(road[2], LINKS.west[2]);
});
test('actual authored routes support markers and walking both ways on every day', async () => {
  for (let day = 1; day <= 5; day++)
    for (const [place, target, mark, zone] of [
      ['forecourt', 'shotengai', 'shop_lane', 'shop_exit'],
      ['shotengai', 'forecourt', 'office_lane', 'office_exit'],
    ]) {
      const story = (await import(`../../story/${day === 1 ? '' : `day${day}/`}${place}.js`)).default;
      for (const event of [`talk:${mark}`, `zone:${zone}`]) {
        const node = story.on[event];
        assert.equal(typeof node, 'string', `${day} ${event}`);
        assert.ok(
          story.nodes[node].some((n) => n.do === 'trip' && n.to === target),
          `${day} ${event} → ${target}`,
        );
      }
    }
});
hooks.deregister();
