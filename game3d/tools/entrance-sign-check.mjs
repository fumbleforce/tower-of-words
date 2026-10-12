// Reproduce #531 through the desktop perspective camera and the phone overview, with public state only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const out = process.argv[2];
assert.ok(out, 'Provide an evidence folder');
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL || 'http://127.0.0.1:8771/game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map(s => s.split('x').map(Number));
const errors = [], reports = [];
await withBrowserJob('entrance-sign-check', async browser => {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => new URL(route.request().url()).pathname.includes('/private/') ? route.fulfill({status:404,body:''}) : route.continue());
    await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v:99,privateMode:false,voiceOn:false,textSpeed:'instant',cameraMode:'follow' })));
    for (const period of ['morning', 'evening']) {
      await page.goto(`${base}/index.html?place=office_quarter&day=3&mc=eric&q=2`);
      await page.waitForFunction(() => globalThis.__done && globalThis.__game?.place && !globalThis.__game.busy, null, {timeout:120000});
      await page.waitForFunction(() => !globalThis.document.getElementById('boot') || globalThis.document.getElementById('boot').classList.contains('gone'));
      if (process.env.CHECK_CLEARANCE === '1') {
        const fixtures = await page.evaluate(async () => {
          const { fittings } = await import('./js/scenes/office-quarter/row.js');
          const { faces, faceAt } = await import('./js/scenes/outdoor/block-face.js');
          return Object.entries(faces([0, 6, 0, 6])).map(([face, f]) => {
            let board, backing;
            const c = { c0: 1.2, c1: 4.8, out: 1.3, y: 2.04, h: .42 };
            fittings({box: (...args) => backing = args}, {board: (...args) => board = args, card() {}},
              {glowParts: [], lit: []}, {sign: ['しょくひん', 'AMAKAWA FOODS', '#4a6048']}, {f,t:3,canopy:c});
            const at = board[5], edge = faceAt(f, 3, c.out);
            return {face, bottom: at[1] - board[4]/2, fasciaTop:c.y+c.h,
              front: (at[0]-edge[0])*f.n[0]+(at[2]-edge[1])*f.n[1],
              backingBottom:backing[5], backingTop:backing[5]+backing[2]};
          });
        });
        for (const f of fixtures) {
          assert.ok(f.bottom >= f.fasciaTop, `${f.face}: fascia hides sign`);
          assert.ok(f.front > 0, `${f.face}: sign behind fascia`);
          assert.equal(f.backingBottom, f.fasciaTop, `${f.face}: board floats above canopy`);
        }
        reports.push({width,period,fixtures});
      }
      for (const id of ['user-foods', 'foods_office', 'trading_office', 'bank']) {
        const report = await page.evaluate(({id,period}) => {
          const g=globalThis.__game, p=g.player.root.position;
          g.place.onPeriod(period);
          g.walker.stop();
          let at, yaw;
          if(id==='user-foods') { at=[-23.36,-8.81]; yaw=3.11; }
          else {
            const target=g.place.things[id], door=target.face(), step=target.spot();
            const dx=step[0]-door[0], dz=step[1]-door[1], len=Math.hypot(dx,dz);
            at=[door[0]+dx/len*3.2,door[1]+dz/len*3.2]; yaw=Math.atan2(-dx,-dz);
          }
          p.set(at[0],0,at[1]); g.walker.sync(); g.place.cam.snap(p); g.followCamera.aim(yaw,-.15);
          return {id,period,at,yaw,follow:g.followCamera.active};
        }, {id,period});
        assert.equal(report.follow, width >= 700, 'Use the production camera for this screen');
        await page.waitForTimeout(1000);
        await page.screenshot({path:`${out}/${width}-${period}-${id}.png`});
        reports.push({...report,width});
      }
    }
    await page.close();
  }
}, {timeoutMs:240000,gpuWaitMs:900000});
fs.writeFileSync(`${out}/report.json`, JSON.stringify({reports,errors},null,2));
assert.deepEqual(errors,[]);
console.log('PASS perspective entrance captures', reports.length);
