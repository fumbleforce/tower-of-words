import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'espree';
import * as THREE from '../../vendor/three/three.module.js';
import { snapshotPeople, restorePeople } from '../../js/places/saved-people.js';

function declaration(file, name) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  let found;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (['FunctionDeclaration', 'VariableDeclarator'].includes(node.type) && node.id.name === name) found = node;
    Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(visit) : visit(value));
  };
  visit(ast);
  assert.ok(found, name);
  return found.type === 'FunctionDeclaration' ? source.slice(...found.range) : found.init.value;
}

test('train passengers retain seated status even when the seat pose puts the root below floor height', () => {
  const file = '../../js/train/people.js';
  const sit = new Function('HIP', 'SEAT_Y', `return ${declaration(file, 'sit')}`)(
    declaration(file, 'HIP'), declaration('../../js/train/car.js', 'SEAT_Y'));
  const standUp = new Function(`return ${declaration('../../js/places/train.js', 'standUp')}`)();
  const group = () => new THREE.Group();
  const passenger = { root: group(), hips: group(), head: group(),
    legs: [group(), group()], knees: [group(), group()], arms: [group(), group()] };
  passenger.root.scale.setScalar(declaration(file, 'S'));
  sit(passenger);
  assert.ok(passenger.root.position.y < 0, 'real train seat pose has a negative root height');
  assert.equal(passenger.seated, true);
  const saved = snapshotPeople({ kuroda: passenger });
  standUp(passenger);
  assert.equal(passenger.seated, false);
  assert.equal(passenger.root.position.y, 0);
  restorePeople({ kuroda: passenger }, saved);
  assert.equal(passenger.seated, true);
  assert.deepEqual(snapshotPeople({ kuroda: passenger }), saved);
});
