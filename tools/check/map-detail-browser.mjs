// Native map controls and visual captures, using only the public day-three start.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
const phone = process.argv.includes('--phone');
const width = phone ? 390 : 1366, height = phone ? 844 : 860;
const shots = new URL('../../game3d/shots/codex-map-detail/', import.meta.url);
fs.mkdirSync(shots, { recursive: true });
await withBrowserJob('map-detail', async browser => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('amakawa-settings', JSON.stringify({ voiceOn: false, textSpeed: 'instant' }));
    setInterval(() => { const g = window.__game; if (g) { g.setHurry(true); g.ui.auto = !window.__holdTestLine; if (!window.__holdTestLine) g.ui._advance?.(); } }, 40);
  });
  const capture = async name => { await page.waitForTimeout(250); await page.screenshot({ path: new URL(`${width}-${name}.png`, shots).pathname }); };
  try {
    await page.goto(`http://127.0.0.1:${process.env.PORT || 8771}/game3d/index.html?day=3&place=plaza&q=0&mc=${phone ? 'carina' : 'eric'}`);
    await page.waitForFunction(() => window.__game?.place?.name === 'plaza' && !window.__game.busy && document.querySelector('#talk')?.hidden && +getComputedStyle(document.querySelector('#boot')).opacity === 0);
    await capture('minimap');
    const before = await page.evaluate(async () => { const {sim} = await import('/game3d/js/sim.js'); return [sim.day, sim.period, sim.yen]; });
    await page.locator('#minimap').click();
    await capture('overview');
    assert.equal(await page.evaluate(() => window.__game.paused), true);
    const canvas = () => page.locator('#mapView canvas').evaluate(c => c.toDataURL());
    const initial = await canvas();
    await page.locator('#mapView [data-zoom="in"]').click();
    await page.waitForTimeout(100);
    assert.notEqual(await canvas(), initial, 'zoom redraws the map');
    const zoomed = await canvas();
    const area = await page.locator('#mapView .mv-map').boundingBox();
    if (phone) {
      const cdp = await context.newCDPSession(page);
      const touch = (x,y,id) => ({x,y,id,radiusX:2,radiusY:2,force:1});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(100,220,1),touch(240,220,2)]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(70,220,1),touch(270,220,2)]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.detach();
    } else {
      await page.mouse.move(area.x+area.width/2,area.y+180);
      await page.mouse.down();
      await page.mouse.move(area.x+area.width/2+70,area.y+220,{steps:8});
      await page.mouse.up();
    }
    await page.waitForTimeout(120);
    assert.notEqual(await canvas(),zoomed,phone?'native pinch zooms':'drag pans');
    await page.locator('#mapView .mv-fit').click();
    await capture('island');
    await page.locator('#mapView .mv-home').click();
    await page.locator('#mapView .mv-pins [data-pick="forecourt"] .dot').click();
    assert.match(await page.locator('#mapView .mv-card').innerText(), /Forecourt/);
    await capture('forecourt');
    if (phone) {
      await page.locator('#mapView .mv-places').click();
      await capture('places');
    }
    await page.locator('#mapView .mv-list [data-pick="office"]').click();
    await capture('b2');
    assert.equal(await page.locator('#mapView .mv-go').isEnabled(), true);
    // Labels must not cover another pin's dot or another displayed label.
    const overlaps = await page.evaluate(() => {
      const pins = [...document.querySelectorAll('#mapView .pin:not([hidden])')];
      const rect = e => { const r=e.getBoundingClientRect(); return {x0:r.left,x1:r.right,y0:r.top,y1:r.bottom}; };
      const hit = (a,b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
      const labels = pins.filter(p => !p.classList.contains('nolabel')).map(p => ({id:p.dataset.pick,r:rect(p.querySelector('.lb'))}));
      return labels.flatMap((l,i) => [...pins.filter(p => p.dataset.pick !== l.id && hit(l.r,rect(p.querySelector('.dot')))).map(p => `${l.id}/${p.dataset.pick}`), ...labels.slice(i+1).filter(o=>hit(l.r,o.r)).map(o=>`${l.id}/${o.id}`)]);
    });
    assert.deepEqual(overlaps, []);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('#mapView') !== null), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__game.mapOpen);
    assert.equal(await page.evaluate(() => window.__game.paused), false);
    await page.evaluate(() => {
      window.__holdTestLine = true;
      window.__game.ui.auto = false;
      void window.__game.beat(() => window.__game.runner.steps(['> A test line.']));
    });
    await page.waitForFunction(() => !document.querySelector('#talk').hidden);
    await page.keyboard.press('m');
    await page.waitForFunction(() => window.__game.mapOpen && document.querySelector('#mapView').classList.contains('in'));
    if (phone) await page.locator('#mapView .mv-places').click();
    await page.locator('#mapView .mv-list [data-pick="office"]').click();
    assert.equal(await page.locator('#mapView .mv-go').isDisabled(),true);
    assert.match(await page.locator('#mapView .mv-why').innerText(),/conversation/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__holdTestLine = false; });
    await page.waitForFunction(() => !window.__game.busy && document.querySelector('#talk').hidden);
    await page.locator('#minimap').click();
    if (phone) await page.locator('#mapView .mv-places').click();
    await page.locator('#mapView .mv-list [data-pick="office"]').click();
    await page.locator('#mapView .mv-go').click();
    await page.waitForFunction(() => window.__game.place.name === 'office' && !window.__game.busy && !window.__game.transition);
    const after = await page.evaluate(async () => { const {sim} = await import('/game3d/js/sim.js'); return [sim.day,sim.period,sim.yen]; });
    assert.deepEqual(after,before);
    assert.deepEqual(errors,[]);
    console.log(`PASS map ${width}: native pins, list/B2, zoom, recenter, focus, Escape, pause and no clock/money change`);
  } catch (e) { console.error(await page.evaluate(() => ({map:window.__game.mapOpen, paused:window.__game.paused,body:document.body.className,active:document.activeElement?.tagName,talk:document.querySelector('#talk')?.hidden,layers:[...document.querySelectorAll('.layer.in')].map(x=>x.id)}))); await capture('failure'); throw e; }
  finally { await context.close(); }
}, { timeoutMs: 150000 });
