// Native clock actions on free days, authored-workday guards and responsive HUD placement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
const phone=process.argv.includes('--phone'), viewport=phone?{width:390,height:844}:{width:1366,height:860};
const mc=phone?'carina':'eric', base=`http://127.0.0.1:${process.env.PORT||8771}`;
const shots=new URL('../../game3d/shots/codex-clock-controls/',import.meta.url);fs.mkdirSync(shots,{recursive:true});
await withBrowserJob('time-controls',async browser=>{
  const context=await browser.newContext({viewport,hasTouch:phone,isMobile:phone});
  await context.addInitScript(()=>{
    localStorage.setItem('amakawa-settings',JSON.stringify({voiceOn:false,textSpeed:'instant',perfOverlay:true,reduceMotion:true}));
    setInterval(()=>{const g=window.__game;if(g){g.setHurry(true);g.ui.auto=!window.__holdLine;if(!window.__holdLine)g.ui._advance?.();}},30);
  });
  const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
  const settled=name=>page.waitForFunction(name=>{const g=window.__game;return g?.place?.name===name&&!g.busy&&!g.transition&&!g.pendingStart&&document.querySelector('#talk')?.hidden&&(!document.querySelector('#boot')||+getComputedStyle(document.querySelector('#boot')).opacity===0);},name);
  const capture=async name=>{await page.waitForTimeout(250);await page.screenshot({path:new URL(`${viewport.width}-${name}.png`,shots).pathname});};
  const state=()=>page.evaluate(async()=>{const {sim,loadSave}=await import('/game3d/js/sim.js');const g=window.__game;return {day:sim.day,period:sim.period,yen:sim.yen,inv:sim.inv,tickets:Object.fromEntries(Object.entries(loadSave().flags).filter(([k])=>k.startsWith('ticket_'))),saved:loadSave().period,people:Object.fromEntries(Object.entries(g.place.people).map(([k,p])=>[k,p.root.visible])),grade:g.place.grade};});
  async function open(){await page.locator('#clock').click();await page.locator('#timeMenu.in').waitFor();assert.equal(await page.evaluate(()=>window.__game.paused),true);}
  async function waitTo(period){await open();await page.locator(`#timeMenu [data-period="${period}"]`).click();await page.waitForFunction(()=>!window.__game.busy&&!window.__game.paused);assert.equal((await state()).period,period);}
  async function hudClear(){await page.waitForTimeout(550);const r=await page.evaluate(()=>{const p=document.querySelector('#perfHud').getBoundingClientRect(),hud=document.querySelector('#top').getBoundingClientRect(),clock=document.querySelector('#clock'),icon=clock.querySelector('.ic').getBoundingClientRect(),text=clock.querySelector('.p').getBoundingClientRect();return {perfTop:p.top,hudBottom:hud.bottom,arrow:(()=>{const a=document.querySelector('#goalArrow');if(!a||a.hidden)return null;const r=a.getBoundingClientRect();return {overlap:p.left<r.right&&p.right>r.left&&p.top<r.bottom&&p.bottom>r.top};})(),clockVisible:clock.offsetWidth>0,clockRect:clock.getBoundingClientRect().toJSON(),diff:Math.abs((icon.top+icon.bottom-text.top-text.bottom)/2),w:innerWidth};});assert.ok(r.perfTop>=r.hudBottom+8,JSON.stringify(r));assert.equal(r.clockVisible,true);if(r.arrow)assert.equal(r.arrow.overlap,false,'performance panel leaves goal button clear');assert.ok(r.clockRect.left>=0&&r.clockRect.right<=r.w);assert.ok(r.diff<2,`clock alignment ${r.diff}`);}
  try {
    for(const day of [3,4,5]){
      await page.goto(`${base}/game3d/?day=${day}&mc=${mc}&q=0`);await settled('dorms');
      await page.evaluate(()=>window.__game.travel('plaza'));await settled('plaza');
      const before=await state();await hudClear();
      if(day===3){await capture('hud');await open();await capture('menu');assert.equal(await page.locator('#timeMenu [data-period]').count(),3);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'clock');await page.keyboard.press('Enter');await page.locator('#timeMenu.in').waitFor();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.period),'lunch');await page.keyboard.press('Enter');await page.waitForFunction(()=>!window.__game.busy&&!window.__game.paused);}else await waitTo('lunch');
      const lunch=await state();assert.equal(lunch.period,'lunch');assert.equal(lunch.saved,'lunch');assert.equal(lunch.yen,before.yen);assert.deepEqual(lunch.tickets,before.tickets);assert.deepEqual(lunch.inv,before.inv);
      if(day===3){assert.equal(lunch.people.aoi,false);assert.equal(lunch.people.tama,true);}
      if(day===4)assert.equal(lunch.people.aoi,false);
      if(day===5)assert.equal(lunch.people.aoi,true);
      // Continue through the title uses the actual HUD-generated autosave.
      if(day===3){await page.goto(`${base}/game3d/?mc=${mc}&q=0`);await page.locator('#title .mcont').click();await page.locator('#saves button.slot').filter({hasText:'Autosave'}).click();await settled('plaza');assert.equal((await state()).period,'lunch');assert.equal((await state()).people.tama,true);
        await page.evaluate(()=>{window.__holdLine=true;window.__game.ui.auto=false;void window.__game.beat(()=>window.__game.runner.steps(['> A test line.']));});await page.waitForFunction(()=>!document.querySelector('#talk').hidden);await open();assert.equal(await page.locator('#timeMenu [data-period]').count(),0);assert.match(await page.locator('.time-reason').innerText(),/conversation/);await page.keyboard.press('Escape');await page.evaluate(()=>window.__holdLine=false);await settled('plaza');
        await page.evaluate(async()=>{const {setSetting}=await import('/game3d/js/settings.js');setSetting('uiSize',1.4);});await hudClear();await capture('large-hud');await page.evaluate(async()=>{const {setSetting}=await import('/game3d/js/settings.js');setSetting('uiSize',1);});
      }
      await waitTo('evening');const evening=await state();assert.equal(evening.saved,'evening');assert.notEqual(evening.grade,before.grade,'evening lighting applies');assert.equal(evening.day,day);assert.equal(evening.yen,before.yen);await open();assert.equal(await page.locator('#timeMenu [data-period]').count(),0);assert.match(await page.locator('.time-reason').innerText(),/Sleep/);if(day===3)await capture('evening');await page.keyboard.press('Escape');
      console.log(`PASS clock day${day} ${mc} ${viewport.width}: named increments, schedules, save and no job/money changes`);
    }
    await page.goto(`${base}/game3d/?day=2&mc=${mc}&q=0`);await settled('dorms');const day2=await state();await open();assert.equal(await page.locator('#timeMenu [data-period]').count(),0);assert.match(await page.locator('.time-reason').innerText(),/current goal/);await capture('story-gate');await page.keyboard.press('Escape');assert.deepEqual(await state(),day2);
    await page.goto(`${base}/game3d/?place=plaza&skip=1&mc=${mc}&q=0`);await settled('plaza');await open();assert.equal(await page.locator('#timeMenu [data-period]').count(),0);assert.match(await page.locator('.time-reason').innerText(),/current goal/);await page.locator('#timeMenu .time-scrim').click({position:{x:20,y:300}});assert.equal(await page.evaluate(()=>window.__game.paused),false);
    assert.deepEqual(errors,[]);console.log(`PASS clock ${viewport.width}: keyboard/touch, story and busy gates, Continue, HUD overlap and alignment`);
  }catch(e){await capture('failure');console.error(await page.evaluate(()=>({place:window.__game?.place?.name,busy:window.__game?.busy,paused:window.__game?.paused,active:document.activeElement?.outerHTML,menu:document.querySelector('#timeMenu')?.innerText})));throw e;}finally{await context.close();}
},{timeoutMs:220000});
