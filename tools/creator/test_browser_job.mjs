import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';

// Exercise the real lifecycle, with fake external resources and no browser/GPU.
const source = fs.readFileSync(new URL('../lib/browser-job.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export async function', 'async function');
function harness({load=0, launchFails=false, delay=0, gl='soft', writeFails=false, closeFails=false, onLoad}={}) {
  const dirs = new Map(), proc = new EventEmitter();
  proc.pid=123; proc.env={GL:gl}; proc.exit=code=>{throw Error('unexpected exit '+code);};
  let launches=0, closes=0, loadChecks=0, launchOptions;
  const fakeFs={
    mkdirSync(p){ if(dirs.has(p)) throw Object.assign(Error('exists'),{code:'EEXIST'}); dirs.set(p,''); },
    writeFileSync(p,value){if(writeFails)throw Error('write failed');dirs.set(p.replace('/owner',''),value);},
    readFileSync(p){ if(!dirs.has(p.replace('/owner',''))) throw Object.assign(Error('missing'),{code:'ENOENT'}); return dirs.get(p.replace('/owner','')); },
    rmSync(p){dirs.delete(p);},
    rmdirSync(p){assert.equal(dirs.get(p),'');dirs.delete(p);},
  };
  const chromium={launch:async options=>{launches++;launchOptions=options;if(delay)await new Promise(r=>setTimeout(r,delay));if(launchFails)throw Error('launch failed');return{close:async()=>{closes++;if(closeFails)throw Error('close failed');}};}};
  const os={loadavg:()=>{onLoad?.(dirs);loadChecks++;return[Array.isArray(load)?load[Math.min(loadChecks-1,load.length-1)]:load];}};
  const run = new Function('fs','os','randomUUID','chromium','process',source+'; return withBrowserJob;')(fakeFs,os,()=> 'test-owner',chromium,proc);
  return {dirs,proc,run,counts:()=>({launches,closes}),loadChecks:()=>loadChecks,args:()=>launchOptions.args,launchOptions:()=>launchOptions};
}
let h=harness({load:25});
await assert.rejects(h.run('load',()=>{},{loadWaitMs:0}),/deferred/); assert.deepEqual(h.counts(),{launches:0,closes:0});assert.equal(h.dirs.size,0);
h=harness({load:[30,26,24],onLoad:dirs=>assert.equal(dirs.size,0,'Load admission held a lock')});
await h.run('load-clears',()=>{},{loadWaitMs:100,loadPollMs:2,timeoutMs:100});
assert.equal(h.loadChecks(),3);assert.equal(h.dirs.size,0);assert.ok(h.launchOptions().timeout<100,'Load wait did not reduce the overall launch budget');
h=harness({load:30});await assert.rejects(h.run('load-bounded',()=>{},{loadWaitMs:8,loadPollMs:2}),/deferred/);
assert.ok(h.loadChecks()>1);assert.equal(h.dirs.size,0);assert.equal(h.counts().launches,0);
h=harness({load:30});await assert.rejects(h.run('load-total-deadline',()=>{},{loadWaitMs:100,loadPollMs:2,timeoutMs:8}),/exceeded|deferred/);
assert.equal(h.dirs.size,0);assert.equal(h.counts().launches,0);
h=harness({load:30});let waiting=h.run('load-hangup',()=>{},{loadWaitMs:100,loadPollMs:20});h.proc.emit('SIGHUP');
await assert.rejects(waiting,/hangup/);assert.equal(h.dirs.size,0);assert.equal(h.counts().launches,0);
h=harness({launchFails:true});await assert.rejects(h.run('launch',()=>{}),/launch failed/);assert.equal(h.dirs.size,0);
h=harness();await assert.rejects(h.run('work',()=>{throw Error('page failed');}),/page failed/);assert.deepEqual(h.counts(),{launches:1,closes:1});assert.equal(h.dirs.size,0);
h=harness();await assert.rejects(h.run('timeout',()=>new Promise(()=>{}),{timeoutMs:5}),/exceeded/);assert.equal(h.dirs.size,0);assert.equal(h.counts().closes,1);
h=harness({delay:10});let called=false;const interrupted=h.run('interrupt',()=>{called=true;});h.proc.emit('SIGINT');await assert.rejects(interrupted,/interrupted/);assert.equal(called,false);assert.equal(h.counts().closes,1);assert.equal(h.dirs.size,0);
for(const [signal,message] of [['SIGTERM','terminated'],['SIGHUP','hangup'],['SIGQUIT','quit']]) {
  h=harness({delay:10,gl:'gpu'});called=false;
  const interrupted=h.run('launch-signal',()=>{called=true;});h.proc.emit(signal);
  await assert.rejects(interrupted,new RegExp(message));assert.equal(called,false);assert.equal(h.counts().closes,1);assert.equal(h.dirs.size,0);
  h=harness({gl:'gpu'});
  await assert.rejects(h.run('work-signal',()=>{h.proc.emit(signal);return new Promise(()=>{});}),new RegExp(message));
  assert.equal(h.counts().closes,1);assert.equal(h.dirs.size,0);
  for(const event of ['exit','SIGINT','SIGTERM','SIGHUP','SIGQUIT'])assert.equal(h.proc.listenerCount(event),0);
}
h=harness({delay:10});called=false;await assert.rejects(h.run('late-launch',()=>{called=true;},{timeoutMs:5}),/exceeded/);assert.equal(called,false);assert.equal(h.counts().closes,1);assert.equal(h.dirs.size,0);
h=harness({writeFails:true});await assert.rejects(h.run('owner-write',()=>{}),/write failed/);assert.equal(h.dirs.size,0);assert.equal(h.counts().launches,0);
h=harness({gl:'gpu'});await h.run('gpu',()=>assert.equal(h.dirs.get('/tmp/claude-1000/gpu.lock'),'gpu pid=123 test-owner'));assert.ok(h.args().includes('--use-angle=vulkan'));assert.equal(h.dirs.size,0);
for(const option of ['handleSIGINT','handleSIGTERM','handleSIGHUP'])assert.equal(h.launchOptions()[option],false);
h=harness({gl:'gpu'});h.dirs.set('/tmp/claude-1000/gpu.lock','other gpu job');await h.run('gpu-busy',()=>{});assert.ok(h.args().includes('--use-angle=swiftshader'));assert.equal(h.dirs.get('/tmp/claude-1000/gpu.lock'),'other gpu job');assert.equal(h.dirs.size,1);
h=harness();await h.run('other-owner',()=>{h.dirs.set('/tmp/claude-1000/browser.lock.123','someone else');});assert.equal(h.dirs.get('/tmp/claude-1000/browser.lock.123'),'someone else');
for(const signal of ['exit','SIGINT','SIGTERM','SIGHUP','SIGQUIT'])assert.equal(h.proc.listenerCount(signal),0);
h=harness({gl:'gpu'});await h.run('exit-with-live-browser',()=>{h.proc.emit('exit');assert.equal(h.dirs.size,2,'Exit released locks before browser shutdown');});assert.equal(h.dirs.size,0);
h=harness({gl:'gpu',closeFails:true});await assert.rejects(h.run('failed-close',()=>{}),/close failed/);
assert.equal(h.dirs.size,2,'Unknown browser state must retain its locks');
for(const signal of ['exit','SIGINT','SIGTERM','SIGHUP','SIGQUIT'])assert.equal(h.proc.listenerCount(signal),0);
h=harness({gl:'gpu'});h.dirs.set('/tmp/claude-1000/gpu.lock','old-job pid=99999999 old-uuid');await h.run('no-scavenging',()=>{});
assert.equal(h.dirs.get('/tmp/claude-1000/gpu.lock'),'old-job pid=99999999 old-uuid');
console.log('PASS: bounded lock-free admission, shared deadline, four signal lifecycles, PID ownership, failed-close retention, GPU choice, foreign ownership and listener cleanup.');
