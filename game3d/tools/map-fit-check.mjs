import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const base = process.env.BASE || 'game3d';
const out = process.argv[2] || 'game3d/shots/map-fit/native';
fs.mkdirSync(out, {recursive:true});
const reports = [];
await withBrowserJob('map-fit', async browser => {
  for (const [width,height] of [[1366,860],[390,844]]) {
    const context = await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700});
    const page = await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=shotengai`);
      await page.waitForFunction(()=>globalThis.__done);
      await page.locator('#minimap').click();
      await page.locator('#mapView').waitFor({state:'visible'});
      async function fit(name, press = true) {
        if (press) await page.locator('.mv-fit').click();
        await page.waitForTimeout(180);
        const data = await page.evaluate(async()=>{
          const {BOUNDS}=await import('./js/ui/map/base.js');
          const {PINS}=await import('./js/travel/pins.js');
          const root=globalThis.document.querySelector('#mapView'),area=root.querySelector('.mv-map').getBoundingClientRect();
          const center=id=>{const r=root.querySelector(`.mv-pins [data-pick="${id}"]`).getBoundingClientRect();return [(r.left+r.right)/2-area.left,(r.top+r.bottom)/2-area.top];};
          const a=center('harbour'),b=center('shotengai'),pa=PINS.harbour.at,pb=PINS.shotengai.at;
          const scale=(b[0]-a[0])/(pb[0]-pa[0]);
          const x0=a[0]+(BOUNDS.x0-pa[0])*scale,x1=a[0]+(BOUNDS.x1-pa[0])*scale;
          const z0=a[1]+(BOUNDS.z0-pa[1])*scale,z1=a[1]+(BOUNDS.z1-pa[1])*scale;
          const box=selector=>{const el=root.querySelector(selector),r=el.getBoundingClientRect();return !el.hidden&&r.width?{top:r.top-area.top,bottom:r.bottom-area.top}:null;};
          const header=box('.mv-head'),goal=box('.mv-goal');
          const bottom=Math.min(...['.mv-tools','.mv-scale','.mv-legend','.mv-help'].map(box).filter(Boolean).map(r=>r.top));
          const labels=[...root.querySelectorAll('.mv-pins .pin:not([hidden]):not(.nolabel)')].map(el=>el.dataset.pick);
          const blocks=['.mv-tools','.mv-scale','.mv-legend','.mv-help'].map(s=>root.querySelector(s)).filter(el=>!el.hidden&&el.offsetWidth).map(el=>{const r=el.getBoundingClientRect();return [r.left-area.left,r.top-area.top,r.right-area.left,r.bottom-area.top];});
          return {extent:[x0,z0,x1,z1],w:area.width,h:area.height,top:Math.max(header.bottom,goal?.bottom||0),bottom,labels,blocks};
        });
        assert.ok(data.extent[0]>=10&&data.extent[2]<=data.w-10,`${name}: horizontal extent fits`);
        assert.ok(data.extent[1]>=data.top+10,`${name}: extent clears header`);
        for(const b of data.blocks) assert.ok(!(data.extent[0]<b[2]&&data.extent[2]>b[0]&&data.extent[1]<b[3]&&data.extent[3]>b[1]),`${name}: geography avoids control ${b}`);
        if(width<700&&name==='overview') assert.ok(data.labels.includes('plaza')&&data.labels.includes('east_lane'),'central phone destinations have visible labels');
        reports.push({width,name,...data});
        await page.screenshot({path:`${out}/${name}-${width}.png`});
      }
      await fit('overview');
      await page.locator('.mv-close').click();
      await page.evaluate(()=>{globalThis.__game.ui.goalText='Visit the fountain plaza, then return to the office.';});
      await page.locator('#minimap').click();
      await fit('goal');
      await page.setViewportSize({width:width<700?375:1280,height:width<700?740:720});
      await fit('resized',false);
      if(width<700){await page.locator('.mv-places').click();await page.waitForTimeout(180);await fit('places',false);}
      assert.deepEqual(errors,[]);
    } finally {await context.close();}
  }
},{timeoutMs:260000});
fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2)+'\n');
console.log('PASS map fit: geography clears controls, central phone labels, goal and resize');
