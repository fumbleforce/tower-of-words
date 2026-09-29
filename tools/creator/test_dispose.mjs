import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../../game3d/vendor/three/three.core.js';
import { disposeCharacter } from './dispose.js';

const sharedTexture = new THREE.Texture();
let textureDisposals = 0;
sharedTexture.addEventListener('dispose', () => textureDisposals++);
const scene = new THREE.Scene();
function build() {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig); scene.add(root);
  const bone = new THREE.Bone(); rig.add(bone);
  const skeleton = new THREE.Skeleton([bone]); skeleton.computeBoneTexture();
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial({map:sharedTexture});
  const mesh = new THREE.SkinnedMesh(geometry,material); mesh.bind(skeleton); rig.add(mesh);
  const mixer = new THREE.AnimationMixer(rig);
  mixer.clipAction(new THREE.AnimationClip('idle',1,[new THREE.NumberKeyframeTrack('.rotation[y]',[0,1],[0,.01])])).play();
  const counts = {geometry:0,material:0,bones:0};
  geometry.addEventListener('dispose',()=>counts.geometry++);
  material.addEventListener('dispose',()=>counts.material++);
  skeleton.boneTexture.addEventListener('dispose',()=>counts.bones++);
  return {root,rig,skeleton,mixer,meshes:{first:mesh,alias:mesh},counts};
}
const first = build(), replacement = build();
disposeCharacter(first);
assert.deepEqual(first.counts,{geometry:1,material:1,bones:1});
assert.equal(first.root.parent,null);
assert.equal(first.mixer.stats.actions.inUse,0);
assert.equal(first.mixer.stats.actions.total,0);
assert.equal(replacement.root.parent,scene);
assert.equal(replacement.meshes.first.material.map,sharedTexture);
assert.equal(textureDisposals,0);
disposeCharacter(replacement); // Also covers stale builds never rendered.
assert.deepEqual(replacement.counts,{geometry:1,material:1,bones:1});
assert.equal(textureDisposals,0);
disposeCharacter(null);
console.log('PASS: old/stale builds release instance resources once; cached library texture stays alive.');

// Exercise the actual page rebuild handler with out-of-order loader completions.
const page = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const handler = page.slice(page.indexOf('async function rebuild()'), page.indexOf("document.querySelectorAll('[data-anim]')"));
const recipe = {body:'eric',parts:{head:'eric-head'},colours:{head:'#ffffff'}};
const status = {textContent:''}, pending = [], retired = [];
const old = {id:'old'}, sceneStub = {add() {}};
const api = new Function('buildCharacter','disposeCharacter','setColours','recipe','document','scene','old','SLOTS', `
  let busy=0, ch=old, anim='idle'; const lib={}, fitControls={setDisabled() {}}; function showRecipe() {} function syncRecipeControls() {}
  ${handler}
  return {rebuild, current:()=>ch};
`)(
  (lib, snapshot) => new Promise((resolve,reject)=>pending.push({snapshot,resolve,reject})),
  character => retired.push(character.id),
  (character, colours) => { character.appliedColours={...colours}; },
  recipe,{getElementById:()=>status,querySelectorAll:()=>[]},sceneStub,old,['head'],
);
const result = id => ({id,root:{},recipe:structuredClone(recipe),play(){}});
const slow = api.rebuild(); recipe.body='mio'; const fast = api.rebuild();
assert.equal(pending[0].snapshot.body,'eric');
assert.equal(pending[1].snapshot.body,'mio');
recipe.colours.head='#123456';
const newest=result('newest'); pending[1].resolve(newest); await fast;
pending[0].resolve(result('stale')); await slow;
assert.equal(api.current(),newest);
assert.equal(newest.appliedColours.head,'#123456');
assert.deepEqual(retired,['old','stale']);
assert.equal(status.textContent,'');
recipe.body='missing'; recipe.parts.head='missing-head'; recipe.colours.head='#abcdef';
recipe.fit={hair:{offset:[0,.1,0]}};
const failure=api.rebuild(); pending[2].reject(new Error('asset unavailable')); await failure;
assert.equal(api.current(),newest);
assert.match(status.textContent,/asset unavailable/);
assert.deepEqual(retired,['old','stale']);
assert.equal(recipe.body,'mio');
assert.equal(recipe.parts.head,'eric-head');
assert.equal(recipe.colours.head,'#abcdef');
assert.equal(recipe.fit,undefined);
recipe.colours=null;
const nullColours=api.rebuild(); pending[3].resolve(result('null-colours')); await nullColours;
assert.deepEqual(api.current().appliedColours,{});
const older=api.rebuild(), newer=api.rebuild();
pending[5].reject(new Error('newest failure')); await newer;
pending[4].resolve(result('late-success')); await older;
assert.equal(api.current().id,'null-colours');
assert.match(status.textContent,/newest failure/);
const staleFailure=api.rebuild(), success=api.rebuild();
pending[7].resolve(result('final')); await success;
pending[6].reject(new Error('stale failure')); await staleFailure;
assert.equal(api.current().id,'final');
assert.equal(status.textContent,'');
console.log('PASS: newest build wins, recipes are snapshots, colour edits survive, failures restore shown recipe, null colours work, stale success/failure cannot overwrite newer state.');
