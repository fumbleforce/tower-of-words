import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
  return next(specifier, context);
} });
const THREE = await import('three');
const { seatPoint, seatRow, transferSeats } = await import('../../js/kit/core/seats.js');
const { seatInventory, seatExit, seatOccupied, refreshSeat } = await import('../../js/gameplay/seat-inventory.js');
hooks.deregister();
const place = () => ({ space: new THREE.Group(), seats: {}, nav: { free: () => true } });
test('seat metadata follows nested translated, rotated and elevated furniture and retains stable IDs', () => {
  const p = place(), group = new THREE.Group();
  group.position.set(3, 2, 5); group.rotation.y = Math.PI / 2;
  p.space.add(group); seatPoint(group, 1, 0, .34);
  const seat = [...seatInventory(p).values()][0];
  assert.ok(Math.abs(seat.x - 3) < 1e-6); assert.ok(Math.abs(seat.z - 4) < 1e-6);
  assert.equal(seat.top, 2.34); assert.equal(seat.floor, 2);
  assert.ok(Math.abs(seat.ry - Math.PI / 2) < 1e-6);
  p.space.add(new THREE.Group());
  assert.equal([...seatInventory(p).keys()][0], seat.id);
});
test('canonical story IDs win over duplicate furniture metadata', () => {
  const p = place(); p.seats.guest = { x: 1, z: 2, top: .34, ry: 0 };
  seatPoint(p.space, 1.02, 2, .34);
  assert.deepEqual([...seatInventory(p).keys()], ['guest']);
});
test('long furniture exposes separate slots and collectors transfer metadata once', () => {
  const collector = {}, root = new THREE.Group();
  seatRow(collector, 0, 0, .34, 0, 3.15);
  transferSeats(collector, root); transferSeats(collector, root);
  assert.equal(root.userData.seatPoints.length, 4);
});
test('dining chairs find a side exit when the table blocks the front', () => {
  const p = place(); p.nav.free = (x, z) => x > .4 && Math.abs(z) < .1;
  const out = seatExit(p, { x: 0, z: 0, ry: 0 });
  assert.ok(out[0] > .4); assert.ok(Math.abs(out[1]) < .1);
});
test('only another visible sitter occupies a seat, including crowd rigs', () => {
  const p = place(), root = new THREE.Group(); p.space.add(root);
  const player = { root, seated: true };
  const seat = { x: 0, z: 0, floor: 0 };
  p.people = { eric: player }; assert.equal(seatOccupied({player}, p, seat), false);
  const npc = { root: new THREE.Group(), seated: true }; p.space.add(npc.root); p.crowd = [npc];
  assert.equal(seatOccupied({player}, p, seat), true);
  npc.root.visible = false; assert.equal(seatOccupied({player}, p, seat), false);
});

test('a story-owned rolling chair keeps its ID and follows the actual chair instead of an empty desk', () => {
  const p = place(), chair = new THREE.Group();
  p.seats.my_seat = {x:0,z:0,top:.24,ry:Math.PI};
  chair.userData.seatId = 'my_seat'; chair.position.set(5,0,-1);
  seatPoint(chair,0,0,.24);p.space.add(chair);
  const inventory=seatInventory(p), seat=inventory.get('my_seat');
  assert.equal(inventory.size,1);assert.equal(seat.x,5);
  seat.out=[5,-.45];
  chair.position.set(4.6,0,-1);chair.rotation.y=Math.PI;
  refreshSeat(p,seat);assert.equal(seat.out,undefined);
  chair.position.set(0,0,0);chair.rotation.y=Math.PI;
  refreshSeat(p,seat);assert.equal(seat.x,0);assert.ok(Math.abs(seat.ry-Math.PI)<1e-6);
});
