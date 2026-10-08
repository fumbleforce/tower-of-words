import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withBrowserJob} from '../../tools/lib/browser-job.mjs';
import {scopedRoute} from '../../tools/bible/check-scope.mjs';
const width=+(process.argv[2]||1366),height=width<700?844:860;
const base=process.env.BASE||'game3d';
const out=new URL(`../shots/commons-detail/${process.env.ROUND||Date.now()}-${width}/`,import.meta.url);
fs.mkdirSync(out,{recursive:true});
await withBrowserJob('commons-detail-'+width,async browser=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,isMobile:width<700});
 const page=await context.newPage(),errors=[],routes=[];let closing=false;
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',scopedRoute({publicOnly:true,isClosing:()=>closing,onFailure:s=>errors.push(s)}));
 await page.addInitScript(()=>globalThis.localStorage.setItem('amakawa-settings',JSON.stringify({privateMode:false,voiceOn:false,textSpeed:'instant'})));
 try {
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&place=dorm_commons&q=0&mc=${width<700?'carina':'eric'}`);
  await page.waitForFunction(()=>globalThis.__game?.place?.spots?.commons_books&&!globalThis.__game.busy,null,{timeout:45000});
  await page.waitForTimeout(800);await page.screenshot({path:new URL('01-entry.png',out).pathname});
  if(!process.argv.includes('--details-only')) {
  for(const [i,id] of ['commons_books','commons_sofa','commons_kitchen','commons_fridge','commons_rack','commons_board','commons_printer','commons_table','commons_in'].entries()) {
   const data=await page.evaluate(async id=>{
    const g=globalThis.__game,p=g.place,point=p.spots[id]||p.things[id].spot();
    if(!p.nav.free(...point))throw Error('Blocked target '+id);
    if(!p.nav.path(g.player.root.position.x,g.player.root.position.z,...point))throw Error('Disconnected target '+id);
    await g.walkTo(...point);
    return{id,target:point,actual:g.player.root.position.toArray(),gap:Math.hypot(g.player.root.position.x-point[0],g.player.root.position.z-point[1])};
   },id);routes.push(data);assert.ok(data.gap<.12,JSON.stringify(data));
   await page.waitForTimeout(400);await page.screenshot({path:new URL(`${String(i+2).padStart(2,'0')}-${id}.png`,out).pathname});
  }
  await page.evaluate(async()=>{const g=globalThis.__game;g.place.people.mori.root.visible=true;g.place.people.kenji.root.visible=false;if(!g.place.artClub.ready())throw Error('Approved art activity unavailable');await g.place.hooks.artClub({state:'begin'});});
  await page.waitForTimeout(600);await page.screenshot({path:new URL('11-art-seated.png',out).pathname});
  await page.evaluate(()=>globalThis.__game.place.hooks.artClub({state:'free'}));
  }
  for(const [id,point] of [['kitchen',[2.05,-4.2]],['windows',[-1.9,-4.35]],['storage',[3.5,-.65]]]) {
   await page.evaluate(({point,width})=>{const g=globalThis.__game,c=g.place.cam;g.busy=true;c.yaw=0;c.elev=.8;c.closeOn(point,c.fitDist/(width<700?9:5),.6);c.snap(g.player.root.position);},{point,width});
   await page.waitForTimeout(500);await page.screenshot({path:new URL('detail-'+id+'.png',out).pathname});
  }
  assert.deepEqual(errors,[]);console.log('PASS commons',width,routes.length,'walked routes;',process.argv.includes('--details-only')?'detail captures':'approved art seats');
 } finally {
  fs.writeFileSync(new URL('report.json',out),JSON.stringify({width,base,routes,errors},null,2));
  closing=true;await context.close();
 }
},{timeoutMs:280000});
