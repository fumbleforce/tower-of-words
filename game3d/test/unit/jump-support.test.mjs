import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return next(s==='three'?new URL('../../vendor/three/three.module.js',import.meta.url).href:s,c);}});
const T=await import('three');
let source=fs.readFileSync(new URL('../../js/movement/jump.js',import.meta.url),'utf8');
source=source.replace(/import .* from '\.\/jump-fx.js';/, 'const dust=()=>{},jumpSound=()=>{},landSound=()=>{};')
 .replace(/import .* from '\.\/walker.js';/,'const RUN=2.07;')
 .replace("'./traversal.js'",JSON.stringify(new URL('../../js/movement/traversal.js',import.meta.url).href))
 .replace("'./jump-bodies.js'",JSON.stringify(new URL('../../js/movement/jump-bodies.js',import.meta.url).href));
const {createJump}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('talking on a raised seat preserves feet support before and after the interaction',()=>{
 const space=new T.Group(),root=new T.Group();space.add(root);
 for(const [y,h] of [[-.1,.2],[.4,.1]]) {const m=new T.Mesh(new T.BoxGeometry(2,h,2),new T.MeshStandardMaterial());m.position.y=y;space.add(m);}
 const game={player:{root,update(){}},place:{space},walker:{sync(){},v:0,speed:1},busy:false};
 const jump=createJump(game);
 assert.equal(jump.restoreSurface({x:0,z:0,y:.45}),true);
 game.busy=true;jump.update(.016);assert.ok(Math.abs(jump.height-.45)<1e-6);
 game.busy=false;jump.update(.016);assert.ok(Math.abs(jump.height-.45)<1e-6);
});
