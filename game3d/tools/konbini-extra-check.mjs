// Real marker clicks, public title Continue and the existing shop-street doorway. No synthetic transaction result.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860, mc = process.argv[3] || 'eric';
const base = `http://127.0.0.1:${process.env.PORT || 8794}/game3d`;
const out = `game3d/shots/codex-konbini/${process.env.ROUND || 'extra'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('konbini-extra', async browser => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  const errors = [], missing = [], report = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) missing.push(r.url()); });
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, skipChecks: true, privateMode: false })));
  const ready = () => page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path);
  const shot = name => page.screenshot({ path: `${out}/${width}-${mc}-${name}.png` });
  const state = () => page.evaluate(async () => {
    const g = globalThis.__game, { flags } = await import('./js/narrative/state.js');
    return { yen: g.sim.yen, inv: [...g.sim.inv], day: g.sim.day, period: g.sim.period, place: g.place.name,
      seated: g.player.seated, position: g.player.root.position.toArray(), flags: Object.fromEntries(Object.entries(flags).filter(([k]) => k.startsWith('konbini_'))),
      conditionPlace: flags.place, lastStep: g.runner.lastStep, trace: g.runner.trace, contacts: g.place.konbini?.contacts || [] };
  });
  async function use(id) {
    await ready();
    await page.evaluate(async id => { const g = globalThis.__game; g.standUp?.(); await g.walkTo(...g.place.things[id].spot()); }, id);
    await page.waitForTimeout(350);
    const point = await page.evaluate(id => {
      const m = globalThis.__game.markers.list.find(m => m.id === id), r = m?.el.querySelector('.pin')?.getBoundingClientRect();
      if (!r || !r.width || !r.height) throw Error('Missing pin ' + id);
      return [r.x + r.width / 2, r.y + r.height / 2];
    }, id);
    if (width < 700) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
    await page.waitForTimeout(100);
    const menu = page.locator('#actMenu:not([hidden]) .use'); if (await menu.isVisible()) await menu.click();
  }
  const captured = new Set();
  async function finish(prefer = [], stop = '') {
    for (let i = 0; i < 500; i++) {
      await page.waitForTimeout(100);
      const s = await page.evaluate(() => ({ bite: /konbini-open(Rice|Milk)-place/.test(globalThis.__game.place.konbini?.contacts.at(-1)?.action || ''), motion: globalThis.__konbiniAction && { ...globalThis.__konbiniAction, elapsed: performance.now() - globalThis.__konbiniAction.at }, busy: globalThis.__game.busy, choice: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b => b.textContent), more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])') }));
      if (s.motion && ['add','bag','take','consume'].includes(s.motion.name) && (s.motion.name === 'consume' ? s.bite : s.motion.elapsed > 550) && !captured.has(s.motion.name)) { captured.add(s.motion.name); await shot('motion-' + s.motion.name); }
      if (!s.busy) return;
      if (s.choice.length) {
        if (stop && s.choice.some(v => v.includes(stop))) return;
        const key = prefer.find(x => s.choice.some(v => v.includes(x)));
        if (!key) throw Error('Unexpected choices ' + JSON.stringify(s.choice));
        await page.locator('#talk .chips button').nth(s.choice.findIndex(v => v.includes(key))).click();
      } else if (s.more) { await shot('clerk'); await page.locator('#talkHit').click(); }
    }
    throw Error('Konbini did not settle');
  }
  const pick = async text => { await page.waitForTimeout(1000); await page.locator('#talk .chips button').filter({hasText:text}).first().click(); };
  async function add(name) { await pick(name); await finish([], 'Put it in the basket.'); await pick('Put it in the basket.'); await finish([], 'Check out.'); }
  await page.addInitScript(() => {
    globalThis.__shopMedia=[];
    const play=globalThis.HTMLMediaElement.prototype.play;
    globalThis.HTMLMediaElement.prototype.play=function(...args){
      if(this.src.includes('/audio/konbini-')){
        const entry={src:this.src,playing:false,ended:false,duration:0,volume:this.volume};
        globalThis.__shopMedia.push(entry);globalThis.__shopAudio=this;
        this.addEventListener('playing',()=>{entry.playing=true;entry.duration=this.duration;},{once:true});
        this.addEventListener('ended',()=>{entry.ended=true;},{once:true});
      }
      return play.apply(this,args);
    };
  });
  async function cancellation(action){
    await page.evaluate(async action=>{
      const g=globalThis.__game;await g.prepare('shotengai');globalThis.__cancelTrip=null;
      const hook=g.place.hooks.konbiniShop;let fired=false;
      g.place.hooks.konbiniShop=async a=>{
        if(a.state===action&&!fired){fired=true;setTimeout(()=>{globalThis.__cancelTrip=g.travel('shotengai',{fast:true,via:'konbini'});},100);}
        return hook(a);
      };
    },action);
  }
  async function cancelled(){
    await page.waitForFunction(()=>!!globalThis.__cancelTrip);await page.evaluate(()=>globalThis.__cancelTrip);await ready();await page.waitForTimeout(700);
    const s=await state();assert.equal(s.place,'shotengai');assert.equal(s.flags.konbini_action_complete,false);
    assert.deepEqual(await page.evaluate(()=>globalThis.__game.runner.frames),[]);return s;
  }
  async function enter(){await use('store_door');await page.waitForFunction(()=>globalThis.__game.place.name==='konbini'&&!globalThis.__game.busy);
    await page.evaluate(()=>{const g=globalThis.__game,act=g.place.hooks.konbiniShop;g.place.hooks.konbiniShop=async a=>{globalThis.__konbiniAction={name:a.state,at:performance.now()};try{return await act(a);}finally{globalThis.__konbiniAction=null;}};});
  }
  try {
    await waitForGame(page,60000,()=>page.goto(`${base}/index.html?day=4&place=shotengai&mc=${mc}`),'play');
    await ready();await page.waitForFunction(()=>!globalThis.document.querySelector('#boot:not(.gone)'));await page.waitForTimeout(700);await enter();
    // Isolate insufficient funds; this fixture changes only the wallet, not a transaction result.
    await page.evaluate(()=>{globalThis.__game.sim.yen=100;});const initial=await state();
    await use('fridge');await finish([], 'Coffee.');await add('Coffee.');await pick('Check out.');await finish([], 'Pay the total');
    await pick('Pay the total');await finish([], 'Pay the total');const denied=await state();
    assert.equal(denied.yen,100);assert.deepEqual(denied.inv,initial.inv);assert.equal(denied.flags.konbini_cant_pay,true);
    await pick('Put everything back.');await finish();await ready();report.push({case:'insufficient funds and returned item',state:await state()});
    await cancellation('add');await use('fridge');await finish([], 'Milk carton.');await pick('Milk carton.');await finish([], 'Put it in the basket.');await pick('Put it in the basket.');
    const stopped=await cancelled();assert.equal(stopped.yen,100);assert.deepEqual(stopped.inv,initial.inv);assert.equal(stopped.flags.konbini_count,0);report.push({case:'leave during pickup ends actual Runner before checkout',state:stopped});
    await enter();
    // A single owned carton fixture isolates cancellation before the first visible sip.
    await page.evaluate(()=>{globalThis.__game.sim.inv.push('milk');globalThis.__game.place.konbini.trade.sync();});
    await cancellation('consume');await use('konbini_seat');await finish([], 'Drink a milk carton.');await pick('Drink a milk carton.');
    const food=await cancelled();assert.deepEqual(food.inv,[...initial.inv,'milk']);assert.equal(food.flags.konbini_food_phase,'selected');report.push({case:'leave before sip preserves purchased food',state:food});
    await enter();await use('konbini_seat');await finish([], 'Drink a milk carton.');await pick('Drink a milk carton.');await finish();await ready();assert.deepEqual((await state()).inv,initial.inv);
    report.push({case:'return and finish sip consumes once',state:await state()});await shot('milk-finished');
    await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('voiceOn',true);});await page.locator('body').click({position:{x:3,y:100}});
    const audio=await page.evaluate(async()=>{
      const a=await import('./js/audio/core.js');
      for(const key of ['welcome','total','bag','thanks','seat']){
        await a.voice('konbini-'+key,{muffle:true});const m=globalThis.__shopAudio;
        if(!m?.ended)await Promise.race([new Promise(r=>m?.addEventListener('ended',r,{once:true})),new Promise(r=>setTimeout(r,10000))]);
      }
      (await import('./js/settings.js')).setSetting('voiceOn',false);return globalThis.__shopMedia;
    });
    assert.equal(audio.length,5);for(const a of audio)assert.ok(a.playing&&a.ended&&a.duration>.2&&a.volume>0,JSON.stringify(a));report.push({case:'five runtime clips',audio});
    await page.evaluate(async()=>{const g=globalThis.__game;g.standUp();await g.walkTo(.3,-1.8);g.walker.facing=Math.PI;g.player.root.rotation.y=Math.PI;(await import('./js/settings.js')).setSetting('cameraMode','follow');});
    await page.waitForTimeout(800);
    if(width>=700){
      await page.waitForFunction(()=>globalThis.__game.followCamera.active);await page.locator('#cameraLook').click();await page.waitForFunction(()=>globalThis.__game.followCamera.captured);await shot('follow-fridge');
      await page.mouse.move(width*.5+210,height*.5,{steps:15});await page.waitForTimeout(500);await shot('follow-stock');
      report.push({case:'follow',...(await page.evaluate(()=>({calls:globalThis.__game.renderer.info.render.calls,cost:globalThis.__game.followCamera.collisionMs})))});await page.keyboard.press('Escape');
    }else assert.equal(await page.evaluate(()=>globalThis.__game.followCamera.active),false);
    await page.evaluate(async()=>{(await import('./js/settings.js')).setSetting('cameraMode','overview');});await page.waitForTimeout(700);await shot('overview-restored');
    assert.deepEqual(errors,[]);console.log('PASS extra',width,mc);
  }finally{fs.writeFileSync(`${out}/${width}-${mc}-extra.json`,JSON.stringify({report,errors,missing},null,2));await page.close();}
},{timeoutMs:280000,gpuWaitMs:180000});
