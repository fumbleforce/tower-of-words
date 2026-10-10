import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
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
const ctx = new Proxy({measureText:t=>({width:String(t).length*8}), createRadialGradient:()=>({addColorStop(){}}), createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
globalThis.document.createElement = () => ({width:128,height:128,getContext:()=>ctx,style:{}});
const {buildCampus} = await import('../../js/scenes/campus.js');
const P = await import('../../js/scenes/campus/plan.js');
test('campus paths connect every exit, print door and the usable bench approach',()=>{
 const w=buildCampus();
 for(const p of [...Object.values(P.EXITS).flatMap(e=>[e.lane,e.in]),P.PRINT_STEP,P.BENCH.out]) {
   assert.ok(w.nav.free(...p), `blocked ${p}`);
   assert.ok(w.nav.path(...P.IN,...p).length, `unreachable ${p}`);
 }
});

const L=await import('../../js/scenes/island-layout.js');
const F=await import('../../js/scenes/forecourt/plan.js');
const O=await import('../../js/scenes/office-quarter/plan.js');
const H=await import('../../js/scenes/harbour/plan.js');
const {canTravel}=await import('../../js/places/definitions.js');
const {storyPath}=await import('../../js/days.js');
test('each pedestrian seam has the identical island endpoint and arrivals land beyond its own trigger',()=>{
 const global=(chunk,p)=>L.toIsland(chunk,...p);
 for(const [campus,chunk,other]of [[P.EXITS.forecourt,'forecourt',F.CAMPUS_EXIT],[P.EXITS.office_quarter,'office_quarter',O.CAMPUS_EXITS.quarter],[P.EXITS.office_shed,'office_quarter',O.CAMPUS_EXITS.shed],[P.EXITS.harbour,'harbour',H.CAMPUS_EXIT]]){
  const a=global('campus',campus.edge),b=global(chunk,other.edge);
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8,`${chunk} no position jump`);
  assert.equal(P.inRect(...campus.in,campus.zone),false);
  assert.equal(P.inRect(...other.in,other.zone),false);
 }
});
test('opening and continuing weeks retain native campus routes at real loader paths',async()=>{
 for(const day of [1,2,3,4,5,6,17,32])for(const [from,to,target]of [['forecourt','campus','campus'],['campus','office_quarter','office_shed'],['office_quarter','campus','campus_quarter'],['harbour','campus','campus'],['campus','print_shop','print_shop'],['print_shop','campus','print_exit']]){
  const story=(await import(new URL('../../js/'+storyPath(from,day),import.meta.url))).default;
  const node=story.on['talk:'+target];assert.ok(node,`${day} ${from} ${target}`);
  assert.equal(story.nodes[node][0].to,to);assert.ok(canTravel(from,to,day));
 }
});
test('campus lighting reverses and keeps navigation stable',()=>{
 const w=buildCampus(),initial=w.sun.intensity,nav=w.nav.rects.map(r=>[...r]);
 w.light.apply('evening');assert.ok(w.sun.intensity<initial);w.light.apply('morning');assert.equal(w.sun.intensity,initial);assert.deepEqual(w.nav.rects,nav);
});
const {buildPrintShop}=await import('../../js/scenes/print-shop/room.js');
test('print shop occupies w3 and keeps all usable approaches connected around solid equipment',()=>{
 const w=buildPrintShop();
 for(const p of [w.door.in,w.door.out,...Object.values(w.spots),...Object.values(w.seats).map(s=>s.out)]){
  assert.ok(w.nav.free(...p),`free ${p}`);const route=w.nav.path(...w.door.in,...p);assert.ok(route?.length,`reachable ${p}`);assert.ok(route.every(p=>w.nav.free(...p)));
 }
 for(const p of [[-1.1,-3.2],[1.3,-5.65],[0,-8.4]])assert.equal(w.nav.free(...p),false);
 const row=L.BUILDINGS.find(b=>b.id==='w3').rect;
 for(const p of [[w.bounds.x0,w.bounds.z0],[w.bounds.x1,0]]){
  const [x,z]=L.toIsland('print_shop',...p);assert.ok(x>=row[0]&&x<=row[2]+1e-7&&z>=row[1]&&z<=row[3]);
 }
 const day=w.sun.intensity;w.period('evening');assert.ok(w.sun.intensity<day);w.period('morning');assert.equal(w.sun.intensity,day);
});

process.on('exit',()=>hooks.deregister());

const { CAMPUS_GARDENS, CAMPUS_TREES, CAMPUS_DETAILS, PRINT_APRONS, insideGarden, gardenPlants } =
  await import('../../js/scenes/campus/landscape-plan.js');
const { campusLandscape } = await import('../../js/scenes/campus/landscape.js');
const { drawPlanting } = await import('../../js/ui/map/terrain.js');
test('campus landscaping preserves the nine tree identities and all existing crossing/seat approaches', () => {
  assert.deepEqual(CAMPUS_TREES, [
    ['pine', -37.3, -40.2, 1.1, 830],
    ['pine', -39.4, -36.9, 0.9, 831],
    ['sakura', -33.2, -36.7, 1.05, 832],
    ['keyaki', -27.9, -31.1, 1.15, 833],
    ['keyaki', -24, -36.4, 0.95, 834],
    ['sakura', -11.8, -36.2, 1.1, 835],
    ['keyaki', -8.9, -42.1, 0.95, 836],
    ['keyaki', -3.4, -27.4, 1, 837],
    ['sakura', 0.6, -37.3, 0.85, 838],
  ]);
  const w = buildCampus();
  for (const garden of CAMPUS_GARDENS) {
    const xs = garden.poly.map((p) => p[0]),
      zs = garden.poly.map((p) => p[1]);
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.12)
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 0.12)
        if (insideGarden(garden.poly, x, z))
          assert.equal(w.nav.free(...P.pt([x, z])), false, `${garden.id} occupies walk ${x},${z}`);
    assert.deepEqual(gardenPlants(garden), gardenPlants(garden), 'rebuild is deterministic');
  }
  for (const [id, [x, z, width, depth]] of Object.entries(CAMPUS_DETAILS))
    for (let xx = x - width / 2; xx <= x + width / 2; xx += 0.1)
      for (let zz = z - depth / 2; zz <= z + depth / 2; zz += 0.1)
        assert.equal(w.nav.free(...P.pt([xx, zz])), false, `${id} occupies walk`);
  for (const p of [P.BENCH.out, P.PRINT_STEP, ...Object.values(P.EXITS).map((e) => e.in)])
    assert.ok(w.nav.path(...P.IN, ...p).length);
});
test('both new print apron wings are real reachable paving beside the original door path', () => {
  const w = buildCampus();
  for (const {
    rect: [x, z, x1, z1],
  } of PRINT_APRONS) {
    const p = P.pt([(x + x1) / 2, (z + z1) / 2]);
    assert.ok(w.nav.free(...p));
    assert.ok(w.nav.path(...P.PRINT_STEP, ...p).length);
  }
});
test('physical garden boundary and map boundary use the exact same shared polygon', () => {
  const garden = CAMPUS_GARDENS.find((g) => !g.loose), // a strip bed (loose gardens have no bed to draw)
    original = garden.poly[0][0];
  garden.poly[0][0] = original + 0.123; // A layout edit must reach both consumers without a parallel map edit.
  try {
    const vertices = [];
    const parts = {
      geo(color, g) {
        if (g.type === 'ShapeGeometry')
          for (let i = 0; i < g.attributes.position.count; i++)
            vertices.push([g.attributes.position.getX(i), g.attributes.position.getZ(i)]);
        g.dispose();
      },
      box() {},
    };
    campusLandscape(parts);
    const paths = [];
    let active;
    const ctx = new Proxy(
      {
        beginPath() {
          active = [];
        },
        moveTo(x, z) {
          active.push([x, z]);
        },
        lineTo(x, z) {
          active.push([x, z]);
        },
        fill() {
          if (active?.length) paths.push(active);
          active = null;
        },
      },
      { get: (o, k) => o[k] || (() => {}) },
    );
    drawPlanting(ctx, false);
    for (const p of garden.poly) {
      const q = P.pt(p);
      assert.ok(vertices.some((v) => Math.hypot(v[0] - q[0], v[1] - q[1]) < 1e-5));
      assert.ok(paths.some((path) => path.some((v) => v[0] === p[0] && v[1] === p[1])));
    }
  } finally {
    garden.poly[0][0] = original;
  }
});

const { campusServiceFront } = await import('../../js/scenes/campus/service-front.js');
const { PRINT_SERVICE_PAD, SERVICE_PAD_TOP, gardenCover } = await import('../../js/scenes/campus/landscape-plan.js');
test('the actual print-stock hardstanding supports the trolley and keeps equipment out of the walking apron', () => {
  const boxes = [], wheels = [], w = buildCampus();
  const parts = {
    box(color, width, height, depth, x, y, z) { boxes.push({ color, width, height, depth, x, y, z }); },
    geo(color, g) { if (color === '#3f4848') { g.computeBoundingBox(); wheels.push(g.boundingBox.clone()); } g.dispose(); },
  };
  campusServiceFront(parts);
  const pad = boxes.find(b => b.color === '#9b9f92');
  const [x,z,x1,z1] = PRINT_SERVICE_PAD, a=P.pt([x,z]), b=P.pt([x1,z1]);
  assert.ok(Math.abs(pad.x-pad.width/2-a[0])<1e-9 && Math.abs(pad.x+pad.width/2-b[0])<1e-9);
  assert.ok(Math.abs(pad.z-pad.depth/2-a[1])<1e-9 && Math.abs(pad.z+pad.depth/2-b[1])<1e-9);
  assert.equal(wheels.length,4);
  for(const wheel of wheels){
    assert.ok(wheel.min.y>=SERVICE_PAD_TOP && wheel.min.y<SERVICE_PAD_TOP+.004);
    assert.ok(wheel.min.x>=a[0] && wheel.max.x<=b[0] && wheel.min.z>=a[1] && wheel.max.z<=b[1]);
  }
  for(const box of boxes.filter(b=>b.height>.06))for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5])
    assert.equal(w.nav.free(box.x+box.width*dx,box.z+box.depth*dz),false,`${box.color} intrudes into a public path`);
});
test('the low planted layer overlaps into groups while keeping its edges within the shared outline', () => {
 // strip beds along their paths (outdoor/bed-layout.js); loose gardens have no low layer
 for(const garden of CAMPUS_GARDENS.filter(g=>!g.loose)){
  const cover=gardenCover(garden);assert.ok(cover.length>=3,garden.id);
  assert.ok(cover.filter(a=>cover.some(b=>a!==b&&Math.hypot(a.x-b.x,a.z-b.z)<a.r+b.r)).length>cover.length*.9);
  for(const p of cover)for(let i=0;i<8;i++)assert.ok(insideGarden(garden.poly,p.x+Math.cos(i*Math.PI/4)*p.r,p.z+Math.sin(i*Math.PI/4)*p.r));
 }
});
