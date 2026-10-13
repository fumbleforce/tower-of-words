import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Group} from '../../vendor/three/three.module.js';
import {readingSeatMotion} from '../../js/places/research-room/seat-motion.js';
test('standing from an older seated save without seatOut keeps x/z and clears the seated pose',async()=>{
 const root=new Group(),holder=new Group(),model=new Group();root.add(holder);holder.add(model);
 root.position.set(1,.13,-2);holder.position.set(.08,0,-.12);
 const player={root,model,seated:true,seatOut:null,freeSeat:'old',setState(){holder.position.set(0,0,0);}};
 const game={player,tween:async(_duration,step)=>{step(1);motion.update();},wait:async()=>{}};
 const motion=readingSeatMotion(game),job={live:()=>true,wait:p=>p};
 await motion.stand(job);
 assert.deepEqual(root.position.toArray(),[1,0,-2]);
 assert.deepEqual(holder.position.toArray(),[0,0,0]);
 assert.equal(player.seated,false);assert.equal(player.seatOut,null);assert.equal(player.freeSeat,null);
});
