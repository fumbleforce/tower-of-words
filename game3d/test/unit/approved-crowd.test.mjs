import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import test from 'node:test';

// Exact user-selected native motion. A texture stays original; B's only allowed
// difference is the recorded fringe support, checked by the candidate projection.
const approved = {
  a: { walk: '04b1425a15ef360f21eb408eb63117b88ae5ef33aa5734b2a4764b3e42c5d765', run: '00db66ef81a0cb9f137fe726f90d9357b2cf2ee050442c0c3f6ed52e399528c1', sit: '4e1e288a287774a2f783b98ad5fae5d143e836f48984313b0fdb4f11c0a29572', idle: '5dcf59704fb25e07253781bc231cbde7eb5fc2f38ef6d9edc2f36f6c5af673a8' },
  b: { walk: '697d746b70b7dec70ee7dfa1a83bb497b2b47ce1149303de197596fb771de78c', run: '9ad446a8bec867089e887c011bb188bde334aa625b450b6e46cf6503d46f84ee', sit: '684f775384f266fc24ad1ac97ebee97f94b52739934e8aa1b65e20ef8fe68936', idle: 'ac64e437c0420fbda4d63e1c1e2bac4e8079ed66ec415c4c3f004b7f2508c826' },
};
const read = (who, file) => fs.readFileSync(new URL(`../../assets/characters/crowd-${who}/${file}`, import.meta.url));
const digest = b => crypto.createHash('sha256').update(b).digest('hex');
for (const who of ['a', 'b']) test(`selected crowd ${who} retains original rig and all native motion`, () => {
  for (const [motion, hash] of Object.entries(approved[who])) assert.equal(digest(read(who, `${motion}.${motion === 'idle' ? 'json' : 'glb'}`)), hash);
  const bytes = read(who, 'walk.glb'), size = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + size).toString());
  for (const bone of ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot']) assert.ok(gltf.nodes.some(n => n.name === bone));
  assert.ok(gltf.skins.length && gltf.animations.length);
});
test('selected A texture remains untouched', () => {
  assert.equal(digest(read('a', 'base.webp')), '032d27323869e1258a1c6f5023ad7782c872b87e87c980ac82d1bdba1ebe2dc0');
});
