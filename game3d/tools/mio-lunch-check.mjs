import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const width = +(process.argv[2] || 1366), step = +(process.argv[3] || 2), mc = width < 600 ? 'carina' : 'eric';
const rootURL = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`;
const out = new URL(`../shots/mio-lunch/${process.env.ROUND || 'round1'}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(`mio-lunch-${width}-${step}`, async browser => {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 860 } });
  const page = await context.newPage(), errors = [], captures = [];
  let closing = false;
  await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }));
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /walkRig|Mio lunch/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({v:2, textSpeed:'instant', voiceOn:false, privateMode:false})));
  const shot = async label => {
    const pose = await page.evaluate(async () => {
      const g = globalThis.__game, r = g?.place?.people?.mio || g?.mioNpc;
      if (!r) return null;
      const THREE = await import('three'), bones = {};
      r.root.traverse(o => { if (o.isBone && /Head|Spine|Hand|Hips|Foot/.test(o.name)) bones[o.name] = g.place.space.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray(); });
      const doors=[]; g.place.space.traverse(o=>{if(o.userData.hinge){ const b=new THREE.Box3().setFromObject(o); b.applyMatrix4(g.place.space.matrixWorld.clone().invert()); doors.push({hinge:o.userData.hinge,rotation:o.rotation.y,min:b.min.toArray(),max:b.max.toArray()}); }});
      let mouthSurface=[];
      const head=bones.mixamorigHead || bones.Head;
      if(head) {
        const forward=new THREE.Vector3(Math.sin(r.root.rotation.y),0,Math.cos(r.root.rotation.y));
        for(const height of [-.04,-.02,0,.015,.025,.04,.06]) {
          const at=new THREE.Vector3(...head).add(new THREE.Vector3(0,height,0)).addScaledVector(forward,.7);
          const origin=g.place.space.localToWorld(at),direction=forward.clone().transformDirection(g.place.space.matrixWorld).negate();
          const hits=new THREE.Raycaster(origin,direction,0,1).intersectObject(r.root,true);
          mouthSurface.push({height,hits:hits.slice(0,5).map(h=>({name:h.object.name,point:g.place.space.worldToLocal(h.point.clone()).toArray(),headLocal:r.model.getObjectByName('Head')?.worldToLocal(h.point.clone()).toArray(),uv:h.uv?.toArray()}))});
        }
      }
      const screenPicks=[];
      let headBone;r.root.traverse(o=>{if(o.isBone && /^(mixamorig)?Head$/.test(o.name))headBone=o;});
      if(g.place.cam.camera.aspect>1 && headBone)for(const xy of [[650,470],[655,474],[660,479]]) {
        const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(xy[0]/1366*2-1,1-xy[1]/860*2),g.place.cam.camera);
        const hit=ray.intersectObject(r.root,true)[0];if(hit)screenPicks.push({xy,at:g.place.space.worldToLocal(hit.point.clone()).toArray(),headLocal:headBone.worldToLocal(hit.point.clone()).toArray(),uv:hit.uv?.toArray()});
      }
      return { bones, doors, mouthSurface, screenPicks, root:r.root.position.toArray(), pose:r.pose, lean:r.lean, camera:g.place.cam.camera.position.toArray() };
    });
    fs.writeFileSync(`${out}/${width}-${step}-${label}-pose.json`, JSON.stringify(pose,null,2));
    const file = `${out}/${width}-${step}-${label}.png`; await page.screenshot({ path: file }); captures.push(file); };
  let continued = false, checkpoint = null;
  try {
    await waitForGame(page, 60000, () => page.goto(`${rootURL}/index.html?day=5&place=office&mc=${mc}&q=0${process.env.QS || ''}`), 'play');
    await page.waitForFunction(() => !globalThis.__game.busy);
    const setup = async ({step,seed,choice,diagnostic}) => {
      const g = globalThis.__game, S = await import('./js/sim.js'), {ui,setMuted} = await import('./js/ui.js');
      const {flags} = await import('./js/narrative/state.js');
      if (seed) {
      S.meet(g,'mio'); S.bonds.person('mio').pts = step === 3 ? 14 : 6;
      S.bond(g,'mio',0,{source:'scene',key:'mio-lunch-fixture'});
      g.hooks.period({to:'lunch'});
      const sender = g.place.sender.state;
      for (const action of [{type:'offer'},{type:'wake'},{type:'select',row:'1:1'},{type:'select',row:'2:0'},
        {type:'hold',item:25},{type:'retry'},{type:'advance'},{type:'advance'},{type:'advance'},{type:'advance'}]) sender.act(action);
      g.place.mioLunch.sync();
      }
      const sender = g.place.sender.state;
      setMuted(true); ui.auto = true;
      globalThis.__mioProof = { lines:[], contactCount:0, capture:null, done:false, errors:[], choices:[], routes:[], routeShots:[] };
      const run = g.place.mioLunch.stage.run;
      g.place.mioLunch.stage.run = async args => { try {return await run(args);} catch(e) {globalThis.__mioProof.errors.push({action:args,error:String(e),stack:e.stack}); throw e;} };
      const say = ui.say;
      ui.say = function(...args) { this.auto = false; const result = say.apply(this,args); globalThis.__mioProof.lines.push(args[1]); globalThis.__mioProof.capture = 'line-' + globalThis.__mioProof.lines.length; return result; };
      ui.autoPick = () => { const wanted = choice === 'defer' ? 'Another time.' : choice === 'eat' ? 'Go and eat. I can keep an eye on it.' : step === 2 ? 'Stay for the rest of lunch.' : 'I can check the vent.';
        const options = g.runner.lastStep.choice; const i = options.findIndex(o=>o.text===wanted); globalThis.__mioProof.choices.push(options[Math.max(i,0)].text); return Math.max(i,0); };
      if (diagnostic) {
        const contacts=g.place.mioLunch.stage.hands.contacts, push=contacts.push.bind(contacts), wait=g.wait.bind(g);
        contacts.push=(...entries)=>{const n=push(...entries),last=entries.at(-1);
          if(['cable-pickup','cable-hook','bento-pickup'].includes(last?.id)) {
            globalThis.__mioProof.contactCount=contacts.length; globalThis.__mioProof.capture=last.id;
            globalThis.__mioContactHeld=true;g.paused=true;
          }return n;};
        g.wait=async(...args)=>{if(globalThis.__mioContactHeld) await new Promise(resolve=>globalThis.__mioContactRelease=resolve);return wait(...args);};
      }
      globalThis.__mioTimer = setInterval(()=>{ const proof=globalThis.__mioProof, contacts=g.place.mioLunch.stage.hands.contacts;
        if (!proof.capture && contacts.length>proof.contactCount) { proof.contactCount=contacts.length; proof.capture=contacts.at(-1).id; g.paused=true; }
        const r=g.place.people.mio || g.mioNpc, p=r.root.position;
        const phase=g.place.mioLunch.stage.phase;
        if (r._walk && p.x>4.6 && p.x<5.6 && p.z>-.65 && p.z<.65) {
          proof.routes.push({phase,at:p.toArray(),wallRadius:g.place.nav.R,bodyRadius:.24*g.place.charScale,clearance:g.place.nav.clearance(p.x,p.z)});
          const id=phase==='return' ? 'door-return' : 'door-out';
          if(!proof.capture && p.z>-.15 && p.z<.25 && !proof.routeShots.includes(id)) {proof.routeShots.push(id);proof.capture=id;g.paused=true;}
        }
        if(!proof.capture && p.x < -5 && p.z < -3.15 && r.root.visible) {
          const id=phase==='return' ? 'lift-return' : 'lift-out';
          if(!proof.routeShots.includes(id)) {proof.routeShots.push(id);proof.capture=id;g.paused=true;}
        }
        g.setHurry(step===3 && !proof.capture);
      },20);
      return { sender:structuredClone(sender.read()), flags: Object.fromEntries(Object.entries(flags).filter(([k])=>k.startsWith('sender_'))),
        offered:flags.mio_lunch_offer, monitors:[g.place.sender.props.deskMonitor,g.place.sender.props.consoleScreen.parent].map(o=>{o.updateWorldMatrix(true,false);return o.matrixWorld.toArray();}) };
    };
    const before = await page.evaluate(setup,{step,seed:true,choice:process.env.CHOICE,diagnostic:!!process.env.DIAGNOSTIC_CONTACTS});
    assert.equal(before.offered,step); assert.deepEqual(before.sender.acknowledged,[24,26,27]); assert.equal(before.sender.held,25);
    await page.waitForTimeout(1800);
    await shot('layout');
    await page.evaluate(()=>{const g=globalThis.__game;g.runner.trigger('talk:mio');globalThis.__mioProof.started=true;});
    const deadline=Date.now()+140000;
    while (Date.now()<deadline) {
      const status = await page.evaluate(()=>({ capture:globalThis.__mioProof.capture, busy:globalThis.__game.busy,
        recovery:globalThis.__game.runner.recoveryError, phase:globalThis.__game.place.mioLunch.stage.phase }));
      if(status.recovery) throw new Error(`${status.recovery} at ${status.phase}`);
      if(status.capture) {
        await page.waitForTimeout(status.capture.startsWith('line-') ? 350 : 120); await shot((continued?'continued-':'') + status.capture);
        if (process.env.DIAGNOSTIC_CONTACTS && ['cable-pickup','cable-hook','bento-pickup'].includes(status.capture)) {
          const camera=await page.evaluate(async()=>{const g=globalThis.__game,T=await import('three'),c=g.place.cam.camera,
            contact=g.place.mioLunch.stage.hands.contacts.at(-1),target=g.place.space.localToWorld(new T.Vector3(...contact.hand));
            const saved={position:c.position.toArray(),quaternion:c.quaternion.toArray(),fov:c.fov};
            c.position.copy(target).add(new T.Vector3(-.9,.65,.9));c.lookAt(target);c.fov=45;c.updateProjectionMatrix();c.updateMatrixWorld(true);return saved;});
          await page.waitForTimeout(80);await shot(status.capture+'-held-detail');
          await page.evaluate(saved=>{const c=globalThis.__game.place.cam.camera;c.position.fromArray(saved.position);c.quaternion.fromArray(saved.quaternion);c.fov=saved.fov;c.updateProjectionMatrix();c.updateMatrixWorld(true);},camera);
        }
        if (!continued && process.env.CONTINUE_AT === status.capture) {
          checkpoint = await page.evaluate(async()=>{const S=await import('./js/sim.js'),g=globalThis.__game; S.save(g);return {saved:S.loadSave(),actual:g.place.mioLunch.stage.snapshot(),contacts:g.place.mioLunch.stage.hands.contacts,proof:globalThis.__mioProof};});
          fs.writeFileSync(`${out}/${width}-${step}-checkpoint.json`,JSON.stringify(checkpoint,null,2));
          await waitForGame(page,60000,()=>page.goto(`${rootURL}/index.html?mc=${mc}&q=0${process.env.QS || ''}`),'title');
          await page.locator('#title .mcont').click();
          await page.locator('#saves .slot[data-id="auto"]').click();
          await page.waitForFunction(()=>globalThis.__game?.place?.name==='office' && !globalThis.document.body.classList.contains('at-title') && !globalThis.document.body.classList.contains('title-leaving'));
          await page.evaluate(setup,{step,seed:false,choice:process.env.CHOICE});
          continued=true;
          await shot('continued-start');
          continue;
        }
        await page.evaluate(async()=>{const proof=globalThis.__mioProof,{ui}=await import('./js/ui.js');
          if(proof.capture.startsWith('line-')) { ui.auto=true;ui._advance?.(); }
          proof.capture=null;globalThis.__game.paused=false;globalThis.__mioContactHeld=false;globalThis.__mioContactRelease?.();globalThis.__mioContactRelease=null;
        });
      }
      if(!status.busy) break;
      await page.waitForTimeout(30);
    }
    const after=await page.evaluate(async()=>{const g=globalThis.__game,{flags}=await import('./js/narrative/state.js'),S=await import('./js/sim.js');
      clearInterval(globalThis.__mioTimer);g.setHurry(false);
      return {busy:g.busy,period:g.sim.period,flags,points:S.bonds.person('mio').pts,stage:g.place.mioLunch.stage.snapshot(),
        contacts:g.place.mioLunch.stage.hands.contacts,proof:globalThis.__mioProof,sender:g.place.sender.state.read(),
        monitors:[g.place.sender.props.deskMonitor,g.place.sender.props.consoleScreen.parent].map(o=>{o.updateWorldMatrix(true,false);return o.matrixWorld.toArray();})}; });
    await shot('finished');
    fs.writeFileSync(`${out}/${width}-${step}.json`,JSON.stringify({before,after,continued,errors,captures},null,2));
    assert.equal(after.busy,false); assert.equal(after.period,process.env.CHOICE === 'defer' ? 'lunch' : 'afternoon'); assert.equal(!!after.flags[`ms${step}_mio`],process.env.CHOICE !== 'defer');
    if(process.env.CONTINUE_AT) assert.equal(continued,true);
    assert.equal(after.points,step===3?14:6); assert.deepEqual(after.sender,before.sender); assert.deepEqual(after.monitors,before.monitors);
    if(process.env.CHOICE !== 'defer') {
      const contacts=[...(checkpoint?.contacts||[]),...after.contacts];
      for(const contact of contacts) {
        const limit=contact.id==='bite-mouth' || contact.id==='pencil-tip-mark' ? .025 : .045;
        assert(contact.gap<=limit,`${contact.id}: actual gap ${contact.gap} exceeds ${limit}`);
      }
      if(step===3) {
        const routes=[...(checkpoint?.proof.routes||[]),...after.proof.routes];
        for(const direction of ['return','handover']) assert(routes.some(r=>r.phase===direction),`missing ${direction} route`);
        for(const sample of routes) assert(sample.clearance>=sample.bodyRadius,`door body clearance ${sample.clearance} < ${sample.bodyRadius}`);
      }
    }
    assert.deepEqual(errors,[]); console.log(`PASS Mio lunch ${width} step${step}: actual Talk, complete, unchanged sender and monitor transforms`);
  } catch(error) {
    await shot('failed');
    const live=await page.evaluate(()=>({phase:globalThis.__game?.place?.mioLunch?.stage.phase,proof:globalThis.__mioProof,
      contacts:globalThis.__game?.place?.mioLunch?.stage.hands.contacts})).catch(()=>null);
    fs.writeFileSync(`${out}/${width}-${step}-failure.json`,JSON.stringify({error:error.stack,errors,captures,live},null,2));
    throw error;
  } finally { closing = true; await context.close(); }
},{timeoutMs:240000,gpuWaitMs:1200000});
