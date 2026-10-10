import assert from 'node:assert/strict';
import { test } from 'node:test';
import { beginSavedWalk, snapshotPeople, restorePeople } from '../../js/places/saved-people.js';

function object(position = [0, 0, 0]) {
  const vector = initial => ({ values: [...initial], toArray() { return [...this.values]; }, fromArray(value) { this.values = [...value]; } });
  return { visible: true, position: vector(position), rotation: vector([0, 0, 0, 'XYZ']) };
}
function person() {
  return { root: object(), blob: object(), head: object(), seated: false,
    setState(state) { this.state = state; } };
}

test('people round trip retains seated pose and an unfinished walk destination', () => {
  const mori = person();
  mori.seated = true;
  mori.root.position.fromArray([2.16, -0.07, -3.36]);
  mori.head.rotation.fromArray([0.2, 0.3, 0.1, 'XYZ']);
  mori.savedWalk = { to: [-0.8, 5.5], speed: 1.3 };
  const saved = JSON.parse(JSON.stringify(snapshotPeople({ mori })));
  const restored = person();
  restored._walk = { stale: true };
  restored._savedWalkPromise = Promise.resolve();
  restorePeople({ mori: restored }, saved);
  assert.deepEqual(snapshotPeople({ mori: restored }), saved);
  assert.equal(restored.seated, true);
  assert.equal(restored.state, 'sit');
  assert.equal(restored._walk, null);
  assert.equal(restored._savedWalkPromise, null);
});

test('a pending walk resumes once and completion saves the final seated destination', async () => {
  const mori = person();
  let arrived, saves = [], starts = 0;
  const destination = { to: [2.3, -2.55], speed: 1.3 };
  const move = () => { starts++; return new Promise(resolve => { arrived = () => {
    mori.seated = true; mori.root.position.fromArray([2.16, -0.07, -3.36]); resolve();
  }; }); };
  const completed = () => saves.push(snapshotPeople({ mori }));
  const first = beginSavedWalk(mori, destination, move, completed);
  const duplicate = beginSavedWalk(mori, structuredClone(destination), move, completed);
  assert.equal(first, duplicate);
  await Promise.resolve();
  assert.equal(starts, 1);
  assert.deepEqual(snapshotPeople({ mori }).mori.walk, destination);
  arrived();
  await first;
  assert.equal(saves.length, 1);
  assert.equal(saves[0].mori.walk, undefined);
  assert.equal(saves[0].mori.seated, true);
  assert.deepEqual(saves[0].mori.position, [2.16, -0.07, -3.36]);
});

test('completion of a superseded walk cannot clear or save the new destination', async () => {
  const mori = person();
  let oldDone, newDone, saves = 0;
  const first = beginSavedWalk(mori, { to: [1, 2] }, () => new Promise(r => { oldDone = r; }), () => saves++);
  await Promise.resolve();
  const second = beginSavedWalk(mori, { to: [3, 4] }, () => new Promise(r => { newDone = r; }), () => saves++);
  await Promise.resolve();
  oldDone(); await first;
  assert.deepEqual(mori.savedWalk, { to: [3, 4] });
  assert.equal(saves, 0);
  newDone(); await second;
  assert.equal(mori.savedWalk, null);
  assert.equal(saves, 1);
});

test('restoring a pose invalidates outstanding scripted movement and facing', () => {
  const mio = person();
  mio.root.userData = { walkTok: 4, faceTok: 7 };
  const saved = snapshotPeople({ mio });
  restorePeople({ mio }, saved);
  assert.equal(mio.root.userData.walkTok, 5);
  assert.equal(mio.root.userData.faceTok, 8);
});

// A seated player resumes inside the bench. Ordinary movement needs the saved free-floor exit.
test('Continue retains a seated player exit and clears it when loading a standing save', () => {
  const eric = person();
  eric.seated = true;
  eric.seatOut = [3.2, 1.4];
  eric.root.position.fromArray([3.2, 0.4, 0.9]);
  const saved = JSON.parse(JSON.stringify(snapshotPeople({ eric })));
  const restored = person();
  restorePeople({ eric: restored }, saved);
  assert.deepEqual(restored.seatOut, [3.2, 1.4]);
  assert.equal(restored.seated, true);
  restored.seatOut[0] = 99;
  assert.deepEqual(saved.eric.seatOut, [3.2, 1.4]);
  restorePeople({ eric: restored }, snapshotPeople({ eric: person() }));
  assert.equal(restored.seatOut, null);
  assert.equal(restored.seated, false);
});
