import assert from 'node:assert/strict';
import { test } from 'node:test';
import { movementClockScale, playerMovementDt } from '../../js/movement/clock-scale.js';
test('the first free frame after each hurried trip has ordinary movement speed',()=>{
 const game={busy:true,hurry:false,timeScale:1,setHurry(on){this.hurry=on;this.timeScale=on?6:1;}};
 for(let trip=0;trip<3;trip++) {
  game.busy=true;game.setHurry(true);
  assert.equal(movementClockScale(game,1,6),6);
  game.busy=false;
  const dt=.1*movementClockScale(game,1,6);
  assert.equal(dt,.1);assert.equal(game.timeScale,1);assert.equal(game.hurry,false);
 }
});
test('fast test time stays accelerated without leaking scripted hurry into player control',()=>{
 const game={busy:false,hurry:true,setHurry(on){this.hurry=on;}};
 assert.equal(movementClockScale(game,8,6),8);
 assert.equal(game.hurry,false);
});

test('manual control during busy arrival cannot inherit hurried scripted time',()=>{
 const game={busy:true,hurry:true,player:{scripted:false},walker:{path:null}};
 const hurry=6, frame=.016, substeps=6;
 let distance=0;for(let i=0;i<substeps;i++)distance+=1.43*playerMovementDt(game,frame,hurry);
 assert.ok(Math.abs(distance-1.43*frame)<1e-12);
 game.walker.path=Object.assign([[1,2]],{scripted:true});
 assert.equal(playerMovementDt(game,frame,hurry),frame);
 game.walker.path=null;game.player.scripted=true;
 assert.equal(playerMovementDt(game,frame,hurry),frame);
});
