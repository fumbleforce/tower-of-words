import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Group} from '../../vendor/three/three.module.js';
import {readingSeatMotion} from '../../js/places/research-room/seat-motion.js';
for(const matched of [false,true])test(`standing from an older seated save uses ${matched?'the matching chair exit':'its current x/z when no chair matches'}`,async()=>{
 const root=new Group(),holder=new Group(),model=new Group();root.add(holder);holder.add(model);
 root.position.set(1,.13,-2);holder.position.set(.08,0,-.12);
 const player={root,model,seated:true,seatOut:null,freeSeat:'old',setState(){holder.position.set(0,0,0);}};
 const game={player,tween:async(_duration,step)=>{step(1);motion.update();},wait:async()=>{}};
 const motion=readingSeatMotion(game,matched?{chair:{x:1,z:-2,out:[1,-.8]}}:{}),job={live:()=>true,wait:p=>p};
 await motion.stand(job);
 assert.deepEqual(root.position.toArray(),matched?[1,0,-.8]:[1,0,-2]);
 assert.deepEqual(holder.position.toArray(),[0,0,0]);
 assert.equal(player.seated,false);assert.equal(player.seatOut,null);assert.equal(player.freeSeat,null);
});

for(const cancel of [false,true])test(`seat blend preserves walker yaw axes ${cancel?'when cancelled':'through sitting and standing'}`,async()=>{
 const root=new Group(),holder=new Group(),model=new Group();root.add(holder);holder.add(model);
 const player={root,model,seated:false,seatOut:null,setState(){},sitAt(x,y,z,yaw){root.position.set(x,y,z);root.rotation.set(0,yaw,0);}};
 let live=true,motion;
 const yawOnly=()=>{assert.equal(root.rotation.x,0);assert.equal(root.rotation.z,0);};
 const game={player,walker:{facing:0},tween:async(_duration,step)=>{
  for(const k of [0,.25,.5,.75,1]){step(k);motion.update();yawOnly();if(cancel&&k===.75){live=false;motion.clear();break;}}
 },wait:async()=>{}};
 motion=readingSeatMotion(game);const job={live:()=>live,wait:p=>p};
 await motion.sit(job,{x:1,top:.4,z:-1,ry:Math.PI,out:[1,0]});yawOnly();
 if(!cancel){assert.ok(Math.abs(Math.abs(root.rotation.y)-Math.PI)<1e-10);await motion.stand(job);yawOnly();}
 root.rotation.y=-2.95;
 assert.ok(Math.abs(2*Math.atan2(root.quaternion.y,root.quaternion.w)+2.95)<1e-10,'subsequent walker yaw is the actual body yaw');
});
