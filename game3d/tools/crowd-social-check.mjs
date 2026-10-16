import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860;
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/.claude/worktrees/codex-crowd-alive/game3d';
const out = new URL(`../shots/crowd-social/${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const results = [], topEdge = process.argv.includes('--top-edge');
await withBrowserJob('crowd-social-' + width, async browser => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).pathname.includes('/private/') ? route.fulfill({ status: 404, body: '' }) : route.continue());
  await page.route('**/api/plugins', route => route.fulfill({ json: [] }));
  const shot = async name => { await page.waitForTimeout(650); await page.screenshot({ path: out + name + '.png' }); };
  const ready = () => page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path, null, { timeout: 20000 }).catch(async e => { console.log('READY FAIL', await page.evaluate(() => ({ busy: globalThis.__game.busy, path: globalThis.__game.walker.path, line: globalThis.__game.ui._cur, text: globalThis.document.querySelector('#talk')?.innerText, queue: globalThis.__game.queue.length, held: globalThis.__crowdFixture?.r.socialHold, error: globalThis.__game.runner.recoveryError, arrive: !!globalThis.__game.walker.arrive }))); await shot('ready-failure'); throw e; });
  async function advance() {
    await page.waitForTimeout(350);
    await page.keyboard.press('Enter');
  }
  await waitForGame(page, 180000, () => page.goto(base + '/index.html?place=shotengai&q=0'), 'play');
  await page.waitForFunction(() => !globalThis.document.getElementById('boot') || globalThis.document.getElementById('boot').classList.contains('gone'));
  await ready();
  await page.waitForTimeout(850);
  const target = await page.evaluate(async () => {
    const g = globalThis.__game, P = g.place;
    const { known } = await import('./js/lang.js');
    known.add('ohayo'); // avoid introducing Say while testing one optional word
    const b = P.ambient.pool.find(b => b.state === 'walk' && b.r.root.visible && P.nav.free(b.r.root.position.x, b.r.root.position.z + 0.9));
    if (!b) throw Error('No visible reachable pedestrian fixture');
    const p = P.crowdSocial.people.find(p => p.r === b.r);
    globalThis.__crowdFixture = p; globalThis.__crowdBody = b;
    b.stopped = null;
    // Keep one actual pedestrian in place for the reaction and conversation fixtures.
    b.state = 'still'; b.mode = 'chat'; b.t = 0; b.ph = 0;
    b.r.root.rotation.y = 0;
    g.player.root.position.set(b.r.root.position.x, 0, b.r.root.position.z + 0.9);
    g.walker.sync(); P.cam.snap(g.player.root.position);
    return { id: p.id, word: p.profile.word, speaker: p.profile.speaker, people: P.crowdSocial.people.length,
      registered: P.crowdSocial.people.every(p => P.things[p.id]?.act && P.extras[p.id] === p.r) };
  });
  assert(target.registered); results.push({ coverage: target });
  // Use each screen's native jump control.
  if (width < 700) await page.getByRole('button', { name: 'Jump', exact: true }).tap();
  else {
    await page.keyboard.down('d'); await page.keyboard.down('Space');
    await page.waitForFunction(() => globalThis.__game.jump.air);
    await page.keyboard.up('d'); await page.keyboard.up('Space');
  }
  await page.locator('.crowd-reaction:not([hidden])').waitFor({ timeout: 15000 }).catch(async error => { await shot('failure'); console.log(await page.evaluate(() => ({ place: globalThis.__game.place.name, busy: globalThis.__game.busy, active: globalThis.__game.place.crowdSocial.view.active?.id, player: globalThis.__game.player.root.position.toArray(), person: globalThis.__crowdFixture.r.root.position.toArray(), bubble: globalThis.document.querySelector('.crowd-reaction')?.outerHTML }))); throw error; });
  await shot('jump-reaction');
  assert(await page.locator('.crowd-reaction .gx').count());
  assert.match(await page.locator('.crowd-reaction .gx').first().evaluate(el => globalThis.getComputedStyle(el).filter), /blur\(/);
  await page.waitForTimeout(4000);
  assert(await page.locator('.crowd-reaction').isVisible(), 'reaction must not expire on a timer');
  if (topEdge) {
    const placements = [];
    for (const targetY of [40, 130, 230]) {
      await page.evaluate(async targetY => {
        const g = globalThis.__game, r = globalThis.__crowdFixture.r;
        const THREE = await import('three'), v = new THREE.Vector3();
        const screenY = () => { r.root.getWorldPosition(v); v.y += 1.35 * (g.place.charScale || 1); v.project(g.place.camera); return (1 - v.y) * globalThis.innerHeight / 2; };
        // A pedestrian continues away while Eric stays put: retain the actual native-jump reaction.
        for (let i = 0; i < 5; i++) {
          const y = screenY(); r.root.position.z += 0.1; const slope = (screenY() - y) / 0.1; r.root.position.z -= 0.1;
          if (Math.abs(slope) < 0.01) throw Error('Cannot frame upper-edge speaker');
          r.root.position.z += (targetY - y) / slope;
        }
      }, targetY);
      await shot('top-edge-' + targetY);
      const placement = await page.evaluate(() => {
        const b = globalThis.document.querySelector('.crowd-reaction').getBoundingClientRect();
        const blockers = [...globalThis.document.querySelectorAll('#hud, #goal, #goal2, #goalArrow, #minimap, #jumpBtn, #sayBtn')].filter(el => {
          const r = el.getBoundingClientRect(); return r.width && r.height && globalThis.getComputedStyle(el).visibility !== 'hidden';
        }).map(el => {
          const r = el.getBoundingClientRect();
          return { id: el.id, overlap: Math.max(0, Math.min(b.right,r.right)-Math.max(b.left,r.left)) * Math.max(0,Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top)) };
        });
        return { box: { x: b.x, y: b.y, width: b.width, height: b.height }, blockers };
      });
      assert(placement.blockers.every(b => b.overlap === 0), JSON.stringify(placement));
      placements.push({ targetY, ...placement });
    }
    await page.locator('.crowd-reaction').tap();
    assert(await page.locator('.crowd-reaction').isHidden());
    assert.deepEqual(errors, []);
    fs.writeFileSync(out + 'top-edge-result.json', JSON.stringify(placements, null, 2));
    results.push({ topEdge: placements });
    await page.close();
    return;
  }

  await page.locator('.crowd-reaction').click();
  assert(await page.locator('.crowd-reaction').isHidden());
  results.push({ jump: `${width < 700 ? 'touch Jump' : 'Space'} input, blurred persistent reaction, dismiss works` });
  // Use the real near-person E interaction, leave before typing, then return and practise.
  await page.evaluate(() => { const g = globalThis.__game, p = globalThis.__crowdFixture.r.root.position; g.player.root.position.set(p.x, 0, p.z + 0.8); g.walker.sync(); });
  await page.waitForFunction(id => globalThis.__game.near?.id === id, target.id);
  async function interact() {
    if (width >= 700) return page.keyboard.press('e');
    const xy = await page.evaluate(id => {
      const m = globalThis.__game.markers.list.find(m => m.id === id);
      const b = m.el.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2];
    }, target.id);
    await page.touchscreen.tap(...xy);
    await page.waitForFunction(() => globalThis.__game.ui._cur?.voiceKey === globalThis.__crowdFixture.profile.hello.voice || !!globalThis.document.querySelector('#talk .chips.menu .chip'));
    if (await page.locator('#talk .chips.menu .chip').count()) {
      await page.waitForTimeout(950);
      await page.locator('#talk .chips.menu .chip').first().tap();
    }
  }
  await interact();
  await page.locator('#talk:not([hidden])').waitFor();
  await shot('conversation');
  await advance();
  await page.getByText('Leave', { exact: true }).waitFor();
  await page.waitForTimeout(width < 700 ? 950 : 400);
  await page.getByText('Leave', { exact: true }).click(); await ready();
  const learnedBefore = await page.evaluate(async id => (await import('./js/lang.js')).known.has(id), target.word);
  await interact(); await page.locator('#talk:not([hidden])').waitFor(); await advance();
  await page.getByText('Leave', { exact: true }).waitFor();
  await page.waitForTimeout(width < 700 ? 950 : 400);
  await page.locator('#talk .chip').first().click();
  await page.locator('.tp-in').waitFor(); await shot('practice');
  const ro = await page.evaluate(async id => (await import('./js/lang.js')).WORDS[id].ro, target.word);
  await page.locator('.tp-in').fill(ro); await page.locator('.tp-in').press('Enter');
  await page.waitForFunction(() => !globalThis.document.querySelector('#talk').classList.contains('typing'));
  await page.waitForFunction(() => globalThis.__game.ui._cur?.voiceKey === globalThis.__crowdFixture.profile.answer.voice && globalThis.__game.ui._advance);
  await advance(); await ready();
  assert(await page.evaluate(async id => (await import('./js/lang.js')).known.has(id), target.word));
  assert.equal(await page.evaluate(() => globalThis.__crowdFixture.r.socialHold), false);
  results.push({ talk: `${width < 700 ? 'touch marker' : 'E'}, leave, optional typed reply, learned word, releases person`, learnedBefore });
  // Actual path attempted into the player. Constrain the fixture to a narrow straight approach.
  await page.evaluate(() => {
    const g = globalThis.__game, b = globalThis.__crowdBody, p = b.r.root.position;
    b.state = 'walk'; b.stopped = null; b.line = [[p.x, p.z], [p.x, p.z + 5]]; b.i = 1;
    b.goal = b.line[1]; b.tail = [b.line[1]]; b.toDoor = false; b.offA = false; b.offZ = false; b.wait = false;
    b.speed = b.pace; b.walked = 0; b.stopAt = Infinity;
    g.player.root.position.set(p.x, 0, p.z + 0.55); g.walker.sync();
  });
  await page.locator('.crowd-reaction:not([hidden])').waitFor({ timeout: 15000 }).catch(async error => { await shot('failure'); console.log(await page.evaluate(() => ({ place: globalThis.__game.place.name, busy: globalThis.__game.busy, active: globalThis.__game.place.crowdSocial.view.active?.id, player: globalThis.__game.player.root.position.toArray(), person: globalThis.__crowdFixture.r.root.position.toArray(), bubble: globalThis.document.querySelector('.crowd-reaction')?.outerHTML }))); throw error; });
  await shot('obstruction'); results.push({ obstruction: 'attempted route request visible' });
  await page.evaluate(() => globalThis.__game.place.leave());
  assert.equal(await page.locator('.crowd-reaction').count(), 0, 'leaving removes reaction UI');
  await waitForGame(page, 180000, () => page.goto(base + '/index.html?place=gate&q=0'), 'play');
  const station = await page.evaluate(() => {
    const g = globalThis.__game, P = g.place;
    const ids = ['worker_a', 'worker_b', 'commuter_1', 'commuter_2', 'commuter_3'];
    return ids.map(id => {
      const p = P.crowdSocial.people.find(p => p.id === id), r = P.extras[id];
      const before = r.root.visible; r.root.visible = true;
      const row = { id, attached: p?.r === r, enabled: P.things[id].enabled(), talk: typeof P.things[id].act === 'function',
        pins: g.markers.list.filter(m => m.id === id).length, profile: p.profile.speaker };
      r.root.visible = before; return row;
    });
  });
  assert(station.every(p => p.attached && p.enabled && p.talk && p.pins === 1));
  results.push({ station });
  assert.deepEqual(errors, []);
  fs.writeFileSync(out + 'result.json', JSON.stringify(results, null, 2));
  await page.close();
}, gpuWaitOptions(1200, 280000));
console.log('PASS crowd social', width, JSON.stringify(results));
