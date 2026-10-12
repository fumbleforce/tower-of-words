import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
const T = await import('three');
const { fence } = await import('../../js/kit/street/fence.js');
const { createTraversal } = await import('../../js/movement/traversal.js');
const { canTravel } = await import('../../js/places/definitions.js');
const { storyPath } = await import('../../js/days.js');
const { waysOut } = await import('../../js/travel/ways.js');
const { PROTECTED_EDGES, edgeBlocks } = await import('../../js/scenes/outdoor/protected-edges.js');
const { BUILDINGS } = await import('../../js/scenes/island-layout.js');

test('service fence physically blocks both approaches at walking and running-jump heights, at every detail level', () => {
  for (const level of ['phone', 'standard', 'high']) {
    const space = new T.Group();
    // Collect the actual kit geometry with one plain material, keeping every sheet and bar.
    const p = { level, geo(_c, geometry) { space.add(new T.Mesh(geometry, new T.MeshStandardMaterial())); } };
    fence(p, { from: [-1.5, 0], to: [1.5, 0], variant: 'service', seed: 548 });
    const physical = createTraversal({ space });
    for (const x of [-1.49, -0.97, -0.43, 0, 0.47, 1.04, 1.49])
      for (const feet of [0, 0.5, 0.95, 1.35])
        for (const side of [-1, 1])
          assert.equal(physical.free(x, -side * 0.35, x, side * 0.35, feet, 0.85, true), false, `${level} ${x} ${feet} ${side}`);
    assert.equal(physical.free(0, 1, 0, 0.5, 0, 0.85, false), true, 'free space beside fence remains traversable');
  }
});

test('closed forecourt seam has no native trigger, permitted trip or map way on any playable day', async () => {
  for (const day of [1, 2, 3, 4, 5, 6, 17, 32])
    for (const [from, to, target] of [['forecourt', 'campus', 'campus'], ['campus', 'forecourt', 'forecourt']]) {
      const story = (await import(new URL('../../js/' + storyPath(from, day), import.meta.url))).default;
      assert.equal(canTravel(from, to, day), false, `${day} ${from} trip`);
      assert.equal(story.on['talk:' + target], undefined, `${day} ${from} talk`);
      assert.equal(story.on['zone:' + target + '_exit'], undefined, `${day} ${from} zone`);
      assert.equal(waysOut(from, story, { day, cond: () => true }).some(w => w.to === to), false, `${day} ${from} map`);
    }
  for (const day of [1, 2, 3]) {
    for (const [from, to] of [['campus', 'office_quarter'], ['office_quarter', 'campus'], ['campus', 'harbour'], ['harbour', 'campus'], ['campus', 'print_shop'], ['print_shop', 'campus'], ['harbour', 'ferry_terminal'], ['ferry_terminal', 'harbour']])
      assert.equal(canTravel(from, to, day), true, `${day} ${from} ${to} preserved`);
    assert.equal(canTravel('forecourt', 'plaza', day), true);
    assert.equal(canTravel('forecourt', 'shotengai', day), true);
    if (day > 1) assert.equal(canTravel('forecourt', 'gate', day), true);
  }
});

test('northern fences close their full spans at all detail and jump heights, with ends inside real building walls', () => {
  const ties = [
    [PROTECTED_EDGES.sports[0][0], 'pool_hall'], [PROTECTED_EDGES.sports[1][1], 'gym'],
    [PROTECTED_EDGES.works[0][0], 'factory'], [PROTECTED_EDGES.works[1][1], 'nw_old'],
    [PROTECTED_EDGES.works[2][0], 'factory'], [PROTECTED_EDGES.works[4][1], 'n4'],
  ];
  for (const [[x,z], id] of ties) {
    const [x0,z0,x1,z1] = BUILDINGS.find(b => b.id === id).rect;
    assert(x >= x0 && x <= x1 && z >= z0 && z <= z1, `${id} tie is inside its actual wall`);
  }
  for (const level of ['phone', 'standard', 'high']) {
    const space = new T.Group(), p = { level, geo(_c, geometry) { space.add(new T.Mesh(geometry, new T.MeshStandardMaterial())); } };
    const edges = Object.values(PROTECTED_EDGES).flat();
    for (const [from,to] of edges) fence(p, { from, to, variant: 'service', seed: 552 });
    const physical = createTraversal({ space });
    for (const [a,b] of edges) {
      const len=Math.hypot(b[0]-a[0],b[1]-a[1]), nx=(b[1]-a[1])/len, nz=-(b[0]-a[0])/len;
      for (const t of [0.01,0.25,0.5,0.75,0.99]) for (const feet of [0,0.5,0.95,1.35]) for (const side of [-1,1]) {
        const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
        assert.equal(physical.free(x-nx*.35*side,z-nz*.35*side,x+nx*.35*side,z+nz*.35*side,feet,.85,true),false,`${level} ${a}→${b} ${t} ${feet}`);
      }
    }
  }
});

test('northern boundary footprints preserve the grove bench, chimney nook and weather-station path', async () => {
  const W = await import('../../js/scenes/works/plan.js');
  const points = { sports: [[55.4,-82.1],[58.2,-89.5],[58.2,-77]],
    works: [W.NOOKS.chimney_foot, W.NOOKS.weather_station, [-41.5,-105.8],[-49.8,-108]] };
  for (const [place,list] of Object.entries(points)) for (const [x,z] of list)
    for (const [x0,x1,z0,z1] of edgeBlocks(PROTECTED_EDGES[place]))
      assert(!(x > x0-.3 && x < x1+.3 && z > z0-.3 && z < z1+.3), `${place} point ${x},${z} is clear`);
});

test('works navigation still reaches every public nook, door and exit after northern closure', async () => {
  const P = await import('../../js/scenes/works/plan.js');
  const { Nav } = await import('../../js/movement/navigation.js');
  const [x0,x1,z0,z1] = P.BOUNDS, nav = new Nav(x0-.2,x1+.2,z0-.2,z1+.2,.14);
  nav.extra = (x,z) => P.WALKS.some(r => P.inRect(x,z,r,-.02));
  for (const r of [...P.FURNITURE,...edgeBlocks(PROTECTED_EDGES.works).map(P.rect)]) nav.block(...r);
  const targets = { ...Object.fromEntries(Object.entries(P.NOOKS).map(([id,p]) => [id,P.pt(p)])),
    ...Object.fromEntries(P.DOORS.map(d => [d.id,d.step])),
    ...Object.fromEntries(Object.entries(P.EXITS).map(([id,e]) => [id,e.lane])) };
  for (const [id,p] of Object.entries(targets)) {
    assert(nav.free(...p), `${id} is free`);
    assert(nav.path(...P.IN,...p)?.length, `${id} is reachable`);
  }
});
