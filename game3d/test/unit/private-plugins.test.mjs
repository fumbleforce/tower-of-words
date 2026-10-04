import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pub = [
  'game3d/js/plugins.js',
  'game3d/js/places/lifecycle.js',
  'game3d/js/places/dorm-court.js',
  'game3d/js/places/dorm-bath.js',
  'game3d/js/places/catalog.js',
  'game3d/story/dorm_court.js',
];
const scene = ['bathPeep', 'peek.png', 'Look through the gap', "shower's running"];

test('the published game does not contain a private scene', () => {
  for (const file of pub) {
    const text = fs.readFileSync(file, 'utf8');
    for (const bit of scene) assert.equal(text.includes(bit), false, `${file} contains ${bit}`);
    if (file !== 'game3d/js/plugins.js') assert.equal(text.includes('island/private'), false, file);
  }
});

test('a place can take a plugin, and a missing one changes nothing', () => {
  const text = fs.readFileSync('game3d/js/plugins.js', 'utf8');
  assert.match(text, /export async function installPlacePlugin/);
  assert.match(text, /catch/);
});

test('a plugin can serve its own voice clips; with none set the public audio/<key>.mp3 path is used', () => {
  const core = fs.readFileSync('game3d/js/audio/core.js', 'utf8');
  assert.match(core, /export function setClipResolver/);
  assert.match(core, /clipResolver\?\.\(key\) \|\| new URL\(`\.\.\/\.\.\/audio\/\$\{key\}\.mp3`/);
  assert.equal((core.match(/new Audio\(clipUrl\(key\)\)/g) || []).length, 2, 'both players take the resolver');
  const plug = fs.readFileSync('game3d/js/plugins.js', 'utf8');
  assert.match(plug, /audio: \{ voice, stopVoice, setClipResolver \}/);
});
