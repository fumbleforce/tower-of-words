// Protected native QA: prototype mechanics, visible story UI, real transactions and title Continue.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 1366), mc = process.argv[3] || 'eric';
const mode = process.env.MODE || 'full', height = width < 700 ? 844 : 860;
const base = process.env.BASE || 'http://127.0.0.1:8771/.claude/worktrees/finish-kenji/game3d';
const out = process.env.OUT || `/home/jorgen/repo/japanese/game3d/shots/kenji-outing/${process.env.ROUND || new Date().toISOString().replaceAll(':', '-')}`;
fs.mkdirSync(out, { recursive: true });
const stem = `${width}-${mc}-${mode}`, errors = [], requests = [], samples = [], report = [];
let phase = 'boot';
const loadedHashes = {}, receiptJobs = [];
const sources = ['js/outings', 'js/places/lifecycle.js', 'js/places/day-cast.js', 'js/places/shotengai.js', 'js/places/east-coast.js', 'js/places/conversation-camera.js', 'js/sim.js', 'js/continue.js', 'tools/outing-check.mjs', 'tools/outing-seat-contact.mjs', 'story/conversations/outing.js', 'story/conversations/index.js'];
const hashes = {};
function hash(file) {
  const name = path.resolve('game3d', file);
  if (fs.statSync(name).isDirectory()) for (const child of fs.readdirSync(name)) hash(`${file}/${child}`);
  else hashes[file] = createHash('sha256').update(fs.readFileSync(name)).digest('hex');
}
sources.forEach(hash);
await withBrowserJob(`outing-${stem}`, async browser => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  let closing = false;
  await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(e) }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    requests.push({ url: r.url(), status: r.status() });
    const relative = new URL(r.url()).pathname.split('/game3d/')[1];
    if (relative && (relative.startsWith('js/outings/') || sources.includes(relative)))
      receiptJobs.push(r.body().then(body => { const sha = createHash('sha256').update(body).digest('hex'); (loadedHashes[relative] ||= []).push({ phase, sha }); }, error => errors.push('Source receipt: ' + error.message)));
  });
  await page.exposeFunction('outingSample', value => samples.push({ phase, ...value }));
  await page.exposeFunction('outingMoveNote', value => { report.push({ case: 'make-room', phase, ...value }); console.log('MAKE_ROOM', JSON.stringify(value)); });
  if (process.env.MOVE_DIAG) await page.addInitScript(() => {
    globalThis.__moveCheck = { notes: [], overlaps: [], spins: [], steps: 0 };
    setInterval(() => {
      const g = globalThis.__game, w = g?.walker;
      if (!w || w.__outingDiagnostic) return;
      w.__outingDiagnostic = true;
      const original = w.makeRoom;
      w.makeRoom = function (...args) {
        const old = this.aside, player = g.player.root.position.toArray();
        const result = original.apply(this, args);
        if (this.aside && this.aside !== old) globalThis.outingMoveNote({ at: performance.now(), args, player, aside: this.aside,
          stack: new Error().stack, notes: [...globalThis.__moveCheck.notes], busy: g.busy,
          actors: Object.entries(g.place.people).filter(([,r]) => r.root.visible).map(([id,r]) => ({ id, at: r.root.position.toArray(), walking: !!r._walk })) });
        return result;
      };
    }, 50);
  });
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }));
    setInterval(() => {
      const g = globalThis.__game, r = g?.outing?.actor.rig;
      if (!g?.place || !r) return;
      globalThis.outingSample({ at: performance.now(), place: g.place.name, busy: g.busy,
        transition: g.transition && { ...g.transition }, state: g.outing.state(),
        player: g.player.root.position.toArray(), companion: r.root.position.toArray(),
        aside: g.walker.aside, playerWalking: !!g.player._walk, visible: r.root.visible, current: g.outing.actor.current()?.name, walking: !!r._walk, seated: r.seated });
    }, 200);
  });
  if (process.env.TRIAL_HEIGHT) await page.addInitScript(view => {
    setInterval(() => {
      const P = globalThis.__game?.place, close = P?.cam?.close;
      if (P?.name !== 'shotengai' || close?.conversationShot?.who !== 'kenji') return;
      close.target.y = P.cam.toWorld(0, 0, view.height).y; close.y = view.height;
      close.conversationShot.minDistance = view.minDistance;
    }, 50);
  }, { height: +process.env.TRIAL_HEIGHT, minDistance: 4 });
  const ready = () => page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path, null, { timeout: 45000 });
  const shot = async name => {
    await page.waitForFunction(() => !globalThis.document.body.classList.contains('loadwait') && ['boot', 'xfade', 'fade'].every(id => { const el = globalThis.document.getElementById(id); return !el || el.hidden || +globalThis.getComputedStyle(el).opacity < .02; }), null, { timeout: 15000 });
    await page.waitForFunction(() => {
      const chips = globalThis.document.querySelector('#talk:not([hidden]) .chips');
      return !chips || (!chips.classList.contains('arming') && [...chips.querySelectorAll('button')].every(b => +globalThis.getComputedStyle(b).opacity > .99));
    }, null, { timeout: 10000 });
    await page.waitForFunction(() => { const c = globalThis.__game?.place?.cam; return !c?.close || c.vel.every(v => Math.abs(v) < .08); }, null, { timeout: 12000 });
    if (['ui-arcade-stay', 'ui-arcade-keep-walking'].includes(name)) await page.waitForFunction(() => globalThis.__game.place.cam.vel.every(v => Math.abs(v) < .08), null, { timeout: 15000 });
    await page.waitForTimeout(200);
    report.push({ case: 'capture-ready', name, ui: await page.evaluate(() => ({ chips: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b => ({ text: b.textContent, disabled: b.disabled, opacity: globalThis.getComputedStyle(b).opacity })), camera: globalThis.__game?.place?.camera?.position.toArray(), velocity: globalThis.__game?.place?.cam?.vel })) });
    return page.screenshot({ path: `${out}/${stem}-${name}.png` });
  };
  let dialogueFrame = 0;
  const state = () => page.evaluate(() => {
    const g = globalThis.__game, r = g.outing.actor.rig;
    const describe = rig => ({ position: rig.root.position.toArray(), yaw: rig.root.rotation.y, visible: rig.root.visible,
      seated: !!rig.seated, seatOut: rig.seatOut, meshy: !!rig.meshy, chibi: !!rig.chibi, hips: !!rig.root.getObjectByName('Hips'),
      scale: rig.root.scale.toArray(), parent: rig.root.parent === g.place.space });
    const marker = g.markers.list.find(m => m.id === 'kenji'), anchor = r.root.position.clone();
    marker?.anchor(anchor);
    const projected = anchor.clone().project(g.place.camera);
    const person = g.place.people.kenji, expected = person?.root.getWorldPosition(anchor.clone());
    const frontage = g.place.things.game_centre?.face?.(), p = g.player.root.position;
    const headingError = frontage && Math.atan2(Math.sin(g.player.root.rotation.y - Math.atan2(frontage[0] - p.x, frontage[1] - p.z)), Math.cos(g.player.root.rotation.y - Math.atan2(frontage[0] - p.x, frontage[1] - p.z)));

    return { frontage: frontage && { face: frontage, playerHeadingError: headingError, targetFacing: g.walker.targetFacing }, marker: marker && { enabled: typeof marker.enabled === 'function' ? marker.enabled() : marker.enabled, display: marker.el.style.display, anchor: anchor.toArray(), projected: projected.toArray(), distanceXZ: expected && Math.hypot(anchor.x - expected.x, anchor.z - expected.z) }, place: g.place.name, day: g.sim.day, period: g.sim.period, yen: g.sim.yen, inv: [...g.sim.inv],
      outing: g.outing.state(), player: describe(g.player), companion: describe(r), resident: g.outing.actor.resident(g.place) && describe(g.outing.actor.resident(g.place)), actorPlace: g.outing.actor.current()?.name, actorBinding: g.place.people.kenji === r,
      flags: Object.fromEntries(Object.entries(g.flagsRef).filter(([k]) => /^(outing_|konbini_)/.test(k))) };
  });
  async function checkpoint(name) {
    phase = name;
    const value = await state(); report.push({ case: name, state: value });
    if (['coast-seated', 'coast-continue', 'parting-continue-completed'].includes(name)) {
      assert.equal(value.marker?.enabled, true, 'stationary Kenji marker remains enabled');
      assert.ok(value.marker.distanceXZ < .3, 'marker anchor follows the displayed Kenji rig');
    }
    await shot(name); console.log(name, value.place, value.outing.status, value.outing.stops.join(','));
    return value;
  }
  async function seatProof() {
    const contacts = await page.evaluate(async () => (await import('./tools/outing-seat-contact.mjs')).outingSeatContact(globalThis.__game));
    report.push({ case: 'seat-support-side-view', contacts });
    for (const contact of contacts) assert.ok(Math.abs(contact.gap) < .03, `${contact.who} rendered bench support`);
    for (const yaw of [-Math.PI / 2, Math.PI / 2]) {
      await page.evaluate(yaw => {
        const g = globalThis.__game, P = g.place, a = g.player.root.position, b = g.outing.actor.rig.root.position;
        globalThis.__outingProofClose = P.cam.close;
        P.cam.closeOn([(a.x + b.x) / 2, (a.z + b.z) / 2], 1, .3);
        P.cam.close.conversationShot = { who: 'kenji', yaw, elev: Math.PI / 4, fov: 50, minDistance: 3, halfWidth: 1.1, height: .3 };
        P.cam.snap(a);
      }, yaw);
      await page.waitForTimeout(500); await shot(yaw < 0 ? 'seat-support-left' : 'seat-support-right');
      await page.evaluate(() => { const g = globalThis.__game; g.place.cam.close = globalThis.__outingProofClose; delete globalThis.__outingProofClose; g.place.cam.snap(g.player.root.position); });
    }
  }
  async function use(id, destination, { departureOnly = false } = {}) {
    phase = `walk:${id}`; await ready();
    await page.evaluate(async id => {
      const g = globalThis.__game;
      g.standUp?.();
      if (!g.place.things[id]) throw Error('Missing native thing ' + id);
      g.walker.goTo(...g.place.things[id].spot());
    }, id);
    await page.waitForFunction(() => !globalThis.__game.walker.path || !!globalThis.__game.transition, null, { timeout: 60000 });
    const travelling = destination && await page.evaluate(to => globalThis.__game.transition?.to === to || globalThis.__game.place.name === to, destination);
    if (!travelling) {
      await page.waitForTimeout(350);
      const point = await page.evaluate(({ id, destination }) => {
        if (destination && (globalThis.__game.transition?.to === destination || globalThis.__game.place.name === destination)) return null;
        const marker = globalThis.__game.markers.list.find(m => m.id === id);
        const r = marker?.el.querySelector('.pin')?.getBoundingClientRect();
        if (!r?.width || !r.height) throw Error('Missing native pin ' + id);
        return [r.x + r.width / 2, r.y + r.height / 2];
      }, { id, destination });
      if (point) {
        if (width < 700) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
      }
      await page.waitForTimeout(100);
      const menu = page.locator('#actMenu:not([hidden]) .use');
      if (await menu.isVisible()) await menu.click();
    }
    if (destination && !departureOnly) {
      await page.waitForFunction(name => globalThis.__game.place.name === name && !globalThis.__game.busy, destination, { timeout: 45000 });
      await checkpoint(`arrived-${destination}`);
    }
  }
  async function chat() {
    await ready();
    const seated = await page.evaluate(() => globalThis.__game.player.seated);
    if (!seated) {
      await page.evaluate(() => { const g = globalThis.__game; g.walker.goTo(...g.place.things.kenji.spot()); });
      await ready();
      await page.waitForFunction(() => !globalThis.__game.outing.actor.rig._walk);
    }
    await page.waitForTimeout(1000); // Let the authored camera settle before reading the touch target.
    const point = await page.evaluate(() => { const r = globalThis.__game.markers.list.find(m => m.id === 'kenji').el.querySelector('.pin').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (width < 700) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
    await page.locator('#actMenu:not([hidden]) .use').click();
    // Current Interact opens the topic chooser, or starts its sole topic directly.
    await page.waitForFunction(() => globalThis.__game.busy || !!globalThis.document.querySelector('#actMenu:not([hidden]) .topic'));
    if (await page.evaluate(() => globalThis.__game.busy)) return;
    const topic = page.locator('#actMenu:not([hidden]) .topic');
    assert.match(await topic.innerText(), /^Chat (with Kenji|about our walk)$/); await shot('chat-action-' + (++dialogueFrame));
    await topic.click();
  }
  async function finish(prefer = [], stop = '') {
    for (let i = 0; i < 500; i++) {
      await page.waitForTimeout(100);
      const s = await page.evaluate(() => ({ busy: globalThis.__game.busy,
        choices: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b => b.textContent),
        more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])') }));
      if (!s.busy) return;
      if (s.choices.length) {
        if (stop && s.choices.some(v => v.includes(stop))) return;
        const key = prefer.find(x => s.choices.some(v => v.includes(x)));
        if (!key) throw Error('Unexpected choices ' + JSON.stringify(s.choices));
        await page.waitForTimeout(width < 700 ? 1000 : 400);
        await page.locator('#talk .chips button').nth(s.choices.findIndex(v => v.includes(key))).click();
      } else if (s.more) {
        if (mode.startsWith('story')) {
          await page.waitForTimeout(700);
          const text = await page.locator('#talk .line').innerText();
          report.push({ case: 'dialogue', text, frame: ++dialogueFrame });
          await shot('dialogue-' + dialogueFrame);
        }
        await page.locator('#talkHit').click();
      }
    }
    throw Error('Dialogue did not settle');
  }
  const pick = async text => {
    await page.waitForTimeout(1000);
    await page.locator('#talk .chips button').filter({ hasText: text }).first().click();
  };
  async function continueSave(expectedPlace) {
    phase = 'quickslot-continue';
    if (width < 700) await page.locator('#qsaveBtn').click(); else await page.keyboard.press('F5');
    await page.waitForTimeout(400);
    const receipt = await page.evaluate(async () => { const data = (await import('./js/saves/actions.js')).store.info('quick')?.data; return data && { place: data.place, transition: data.transition, outing: data.world?.outing, stage: data.flags?.outing_stage, state: data.flags?.outing_kenji, runner: data.runner };  });
    assert.ok(receipt, 'native Quickslot was written'); report.push({ case: 'quickslot-receipt', receipt });
    await page.goto(`${base}/index.html?mc=${mc}`);
    await page.locator('#title .mcont').click();
    await page.locator('#saves .slot[data-id="quick"]').click();
    await page.waitForFunction(place => globalThis.__game?.place?.name === place && !globalThis.document.body.classList.contains('at-title'), expectedPlace, { timeout: 45000 });
    await page.waitForTimeout(700);
    return receipt;
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`${base}/index.html?day=10&place=shotengai&mc=${mc}`), 'play');
    await ready();
    await page.waitForFunction(() => !globalThis.document.querySelector('#boot'));
    await page.evaluate(() => globalThis.__game.hooks.period({ to: 'lunch' }));
    await ready();
    // The current central-crossing spawn reaches the arcade by walking straight out before turning.
    // The baseline direct diagonal cuts a shop corner; retain that separate regression evidence.
    await page.evaluate(() => { const g = globalThis.__game; g.walker.goTo(0.3, g.player.root.position.z); });
    await ready();
    await checkpoint('central-crossing-approach');
    if (!['story', 'storyarcade', 'arcadeview'].includes(mode)) assert.equal(await page.evaluate(() => globalThis.__game.outing.invite()), true, 'real visible scheduled Kenji must accept prototype invite');
    await page.waitForFunction(() => globalThis.__game.outing.actor.rig.meshy && globalThis.__game.player.meshy);
    const invited = await checkpoint('invited');
    assert.equal(invited.companion.chibi, false); assert.equal(invited.player.chibi, false);
    if (['story', 'storyarcade', 'arcadeview'].includes(mode)) {
      await chat(); await finish([], 'Invite Kenji for a walk.'); await checkpoint('ui-invite-menu');
      await pick('Invite Kenji for a walk.'); await finish([], 'Explore the shop street together.'); await checkpoint('ui-route-menu');
      await pick('Explore the shop street together.'); await finish(); await ready();
      assert.equal((await checkpoint('ui-invited')).outing.status, 'active');
      await chat(); await finish([], 'Stop by the game centre together.');
      await pick('Stop by the game centre together.'); await finish([], 'Head to the seafront.');
      assert.ok((await checkpoint('ui-arcade-complete')).outing.stops.includes('arcade'));
      if (process.env.CONTINUE_GATE) {
        console.log('AWAIT_VISUAL_GATE', process.env.CONTINUE_GATE);
        const until = Date.now() + 60000;
        while (!fs.existsSync(process.env.CONTINUE_GATE) && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 500));
        assert.ok(fs.existsSync(process.env.CONTINUE_GATE), 'arcade visual gate cleared before Continue');
      }
      if (process.env.STORY_CONTINUE) {
        const before = await state(), frame = dialogueFrame;
        assert.equal(await page.evaluate(() => globalThis.__game.walker.aside), null, 'no delayed aside after paired staging');
        if (process.env.CHECK_FACING) assert.ok(Math.abs(before.frontage.playerHeadingError) < .08, 'player visibly faces actual frontage');
        const choices = await page.locator('#talk .chips button').allTextContents();
        const receipt = await continueSave('shotengai'); assert.ok(receipt.runner?.execution, 'actual runner execution saved');
        await finish([], 'Head to the seafront.');
        const after = await checkpoint('ui-arcade-choice-continue');
        assert.deepEqual(await page.locator('#talk .chips button').allTextContents(), choices);
        assert.equal(dialogueFrame, frame, 'Continue did not replay spoken opening');
        assert.deepEqual(after.outing, before.outing); assert.deepEqual(after.outing.stops, ['arcade']);
        assert.ok(after.companion.visible && after.companion.parent && after.actorBinding);
      }
      if (mode === 'arcadeview') {
        const views = [
          { yaw: -2.65, elev: 42, fov: 55, minDistance: 3, halfWidth: 1.1, height: .25 },
          { yaw: -.5, elev: 42, fov: 55, minDistance: 3, halfWidth: 1.1, height: .25 },
          { yaw: -3.0, elev: 40, fov: 55, minDistance: 3, halfWidth: 1.1, height: .25 },
          { yaw: -2.65, elev: 50, fov: 55, minDistance: 3, halfWidth: 1.1, height: .25 },
        ];
        for (const [i, view] of views.entries()) {
          const geometry = await page.evaluate(view => {
            const g = globalThis.__game, P = g.place, a = g.player.root.position, b = P.people.kenji.root.position;
            P.cam.closeOn([(a.x + b.x) / 2, (a.z + b.z) / 2], 1, view.height);
            P.cam.close.conversationShot = { who: 'kenji', ...view, elev: view.elev * Math.PI / 180 };
            P.cam.snap(a);
            return { player: a.toArray(), companion: b.toArray(), frontage: P.things.game_centre.spot(), close: P.cam.close, camera: P.camera.position.toArray() };
          }, view);
          await page.waitForTimeout(1000); report.push({ case: 'arcade-view-' + i, view, geometry }); await shot('arcade-view-' + i);
        }
      } else if (mode === 'storyarcade') {
        await pick('Keep looking around.'); await finish(); await ready(); await checkpoint('ui-arcade-stay');
        await chat(); await finish([], 'Stop by the game centre together.'); await checkpoint('ui-arcade-chat-reentry');
        await pick('Keep walking together.'); await finish(); await ready(); await checkpoint('ui-arcade-keep-walking');
      } else {
      await pick('Head to the seafront.'); await finish(); await ready(); await checkpoint('ui-coast-goal');
      await use('plaza_lane', 'plaza'); await use('dorm_lane', 'east_lane'); await use('dorm_row', 'east_coast');
      await chat(); await finish([], 'Sit on the seafront bench with Kenji.');
      await pick('Sit on the seafront bench with Kenji.'); await finish([], 'Keep sitting with Kenji.');
      const bench = await checkpoint('ui-bench-controls'); assert.ok(bench.player.seated && bench.companion.seated);
      if (process.env.SIDE_PROOF) await seatProof();
      await pick('Keep sitting with Kenji.'); await finish(); await ready();
      await chat(); await finish([], 'Get up and keep walking.'); await checkpoint('ui-bench-chat');
      assert.ok((await state()).player.seated, 'real bench Chat preserves sitting');
      await pick('Get up and keep walking.'); await finish(); await ready();
      const standing = await checkpoint('ui-standing'); assert.ok(!standing.player.seated && !standing.companion.seated);
      await chat(); await finish([], "Let's split up here."); await pick("Let's split up here."); await finish(); await ready();
      const ended = await checkpoint('ui-finished'); assert.equal(ended.outing.status, 'ended'); assert.equal(ended.outing.callback, 'coast');
      }
    } else if (mode === 'storybench') {
      await page.evaluate(() => globalThis.__game.travel('east_coast', { fast: true })); await ready();
      await chat(); await finish([], 'Sit on the seafront bench with Kenji.'); await checkpoint('ui-before-sit');
      await pick('Sit on the seafront bench with Kenji.'); await finish([], 'Keep sitting with Kenji.');
      const bench = await checkpoint('ui-bench-controls'); assert.ok(bench.player.seated && bench.companion.seated);
      if (process.env.SIDE_PROOF) await seatProof();
      await pick('Keep sitting with Kenji.'); await finish(); await ready();
      await chat(); await finish([], 'Get up and keep walking.'); await checkpoint('ui-bench-chat');
      await pick('Get up and keep walking.'); await finish(); await ready();
      const standing = await checkpoint('ui-standing'); assert.ok(!standing.player.seated && !standing.companion.seated);
    } else if (mode === 'benchview') {
      await page.evaluate(() => globalThis.__game.travel('east_coast', { fast: true })); await ready();
      assert.equal(await page.evaluate(() => globalThis.__game.outing.stop('coast')), true);
      await chat(); await finish([], 'Get up and keep walking.'); await checkpoint('bench-original');
      await page.evaluate(async () => { const g = globalThis.__game; (await import('./js/places/conversation-camera.js')).conversationCamera(g, g.place, {}); });
      const views = [
        { yaw: -.6, elev: 35, fov: 45, minDistance: 4, halfWidth: 1.15, height: .15 },
        { yaw: .15, elev: 30, fov: 45, minDistance: 4, halfWidth: 1.15, height: .15 },
        { yaw: -.6, elev: 25, fov: 45, minDistance: 4, halfWidth: 1.15, height: .35 },
        { yaw: .6, elev: 30, fov: 45, minDistance: 4, halfWidth: 1.15, height: .15 },
      ];
      for (const [i, view] of views.entries()) {
        const geometry = await page.evaluate(view => {
          const g = globalThis.__game, P = g.place, a = g.player.root.position, b = P.people.kenji.root.position;
          P.cam.closeOn([(a.x + b.x) / 2, (a.z + b.z) / 2], 1, view.height);
          P.cam.close.conversationShot = { who: 'kenji', ...view, elev: view.elev * Math.PI / 180 };
          P.cam.snap(a);
          return { player: a.toArray(), companion: b.toArray(), close: P.cam.close, camera: P.camera.position.toArray() };
        }, view);
        await page.waitForTimeout(1000); report.push({ case: 'bench-view-' + i, view, geometry }); await shot('bench-view-' + i);
      }
    } else if (mode === 'arcade') {
      phase = 'arcade-arrival';
      assert.equal(await page.evaluate(() => globalThis.__game.outing.stop('arcade')), true);
      const arcade = await checkpoint('arcade-complete'); assert.deepEqual(arcade.outing.stops, ['arcade']);
      phase = 'parting-motion';
      await page.evaluate(() => { globalThis.__outingFinish = globalThis.__game.outing.finish(); });
      await page.waitForFunction(() => !!globalThis.__game.flagsRef.outing_stage?.parting && !!globalThis.__game.outing.actor.rig._walk);
      await checkpoint('parting-before-save');
      const receipt = await continueSave('shotengai'); assert.ok(receipt.stage?.parting);
      await ready(); const ended = await checkpoint('parting-continue-completed');
      assert.equal(ended.outing.status, 'ended'); assert.equal(ended.outing.callback, 'arcade');
      assert.equal(ended.companion.visible, false);
    } else if (mode === 'unsupported') {
      phase = 'unsupported-departure';
      await use('office_lane', 'forecourt', { departureOnly: true });
      await page.waitForFunction(() => globalThis.__game.transition?.to === 'forecourt' && globalThis.__game.transition.phase === 'leaving', null, { timeout: 60000 });
      const leaving = await checkpoint('unsupported-leaving');
      assert.equal(leaving.outing.status, 'paused'); assert.equal(leaving.companion.visible, true);
      const receipt = await continueSave('forecourt'); assert.equal(receipt.transition?.to, 'forecourt');
      await ready(); const arrived = await checkpoint('unsupported-continue-arrived');
      assert.equal(arrived.outing.status, 'paused'); assert.equal(arrived.companion.visible, false);
    } else if (mode === 'geometry' || mode === 'pausedseat') {
      await page.evaluate(() => globalThis.__game.travel('east_coast', { fast: true })); await ready();
      const geometry = await page.evaluate(async () => {
        const g = globalThis.__game, P = g.place, scale = P.charScale || 1;
        const { benchSeats, before } = await import('./js/places/day3/seats.js');
        const { bodies } = await import('./js/move.js');
        const { freeOutingSeats } = await import('./js/outings/seating.js');
        return { scale, R: P.nav.R, origin: P.spots.terrace_bench, start: P.start, selected: freeOutingSeats(g, g.outing.actor.rig),
          seats: benchSeats(P).map(seat => { const q = before(seat, .85 * scale); return { seat, approach: q, free: P.nav.free(...q, P.nav.R), bodies: bodies(g).map(b => ({ position: b.root.position.toArray(), r: b.r, seatDistance: Math.hypot(seat.x-b.root.position.x, seat.z-b.root.position.z), approachDistance: Math.hypot(q[0]-b.root.position.x,q[1]-b.root.position.z) })) }; }) };
      });
      report.push({ case: 'coast-geometry', geometry }); await checkpoint('coast-geometry');
      if (process.env.SIT || mode === 'pausedseat') {
        assert.equal(await page.evaluate(() => globalThis.__game.outing.stop('coast')), true);
        report.push({ case: 'rendered-bench-contact', contacts: await page.evaluate(async () => (await import('./tools/outing-seat-contact.mjs')).outingSeatContact(globalThis.__game)) });
        if (mode === 'pausedseat') await page.evaluate(() => globalThis.__game.hooks.period({ to: 'afternoon' }));
        const before = await checkpoint('geometry-seated');
        if (process.env.SIDE_PROOF && mode !== 'pausedseat') await seatProof();
        await continueSave('east_coast'); await ready(); const after = await checkpoint('geometry-continue');
        assert.ok(after.player.seated); assert.deepEqual(after.outing, before.outing);
        if (mode === 'pausedseat') assert.equal(after.companion.visible, false); else assert.ok(after.companion.seated);
        assert.ok(Math.hypot(...after.player.position.map((n, i) => n - before.player.position[i])) < .03, 'seated player survives clock pause and Continue');
      }
    } else if (mode === 'clock') {
      await page.evaluate(() => { const g = globalThis.__game; g.walker.goTo(...g.place.things.kenji.spot()); });
      await ready(); await page.waitForTimeout(1500); await checkpoint('before-period-pause');
      await page.evaluate(() => globalThis.__game.hooks.period({ to: 'afternoon' }));
      const paused = await checkpoint('period-paused');
      assert.equal(paused.outing.status, 'paused'); assert.equal(paused.companion.visible, false);
      assert.equal(await page.evaluate(() => globalThis.__game.outing.resume()), true);
      const resumed = await checkpoint('period-resumed');
      assert.equal(resumed.outing.period, 'afternoon');
      await continueSave('shotengai'); await ready();
      assert.equal((await checkpoint('resume-continue')).outing.status, 'active');
      await page.evaluate(() => { const g = globalThis.__game; g.walker.goTo(...g.place.things.kenji.spot()); });
      await ready(); await page.waitForTimeout(1500); await checkpoint('before-finish');
      await page.evaluate(() => globalThis.__game.outing.finish());
      const ended = await checkpoint('after-finish'); assert.equal(ended.outing.status, 'ended');
    } else {
      await use('store_door', 'konbini');
      const before = await state(); assert.equal(before.outing.pending, 'drink');
      await use('fridge'); await finish([], 'Milk carton.'); await pick('Milk carton.');
      await finish([], 'Put it in the basket.'); await pick('Put it in the basket.'); await finish([], 'Check out.');
      assert.equal((await state()).yen, before.yen);
      await pick('Check out.'); await finish(['Pay the total'], 'Take the bag.');
      const paid = await checkpoint('paid-uncollected');
      assert.equal(paid.yen, before.yen - 150); assert.ok(paid.inv.includes('milk'));
      assert.ok(!paid.outing.stops.includes('drink'));
      await continueSave('konbini'); await finish([], 'Take the bag.');
      const restored = await checkpoint('paid-continue');
      assert.equal(restored.yen, paid.yen); assert.deepEqual(restored.inv, paid.inv);
      await pick('Take the bag.'); await finish(); await ready();
      const collected = await checkpoint('collected'); assert.equal(collected.flags.konbini_phase, 'complete');
      await use('konbini_exit', 'shotengai');
      assert.ok((await state()).outing.stops.includes('drink'));
      if (mode === 'repeatshop') {
        await use('store_door', 'konbini'); assert.equal((await state()).outing.status, 'active');
        await use('konbini_exit', 'shotengai'); const repeat = await checkpoint('repeat-shop-no-new-receipt');
        assert.equal(repeat.outing.status, 'active'); assert.deepEqual(repeat.outing.stops, ['drink']);
        assert.equal(repeat.yen, paid.yen); assert.deepEqual(repeat.inv, paid.inv);
      } else {
      await use('plaza_lane', 'plaza'); await use('dorm_lane', 'east_lane'); await use('dorm_row', 'east_coast');
      phase = 'coast-seating';
      assert.equal(await page.evaluate(() => globalThis.__game.outing.stop('coast')), true, 'actual coast pair must arrive and sit');
      const contacts = await page.evaluate(async () => (await import('./tools/outing-seat-contact.mjs')).outingSeatContact(globalThis.__game));
      report.push({ case: 'rendered-bench-contact', contacts });
      for (const contact of contacts) assert.ok(Math.abs(contact.gap) < .03, `${contact.who} rendered bench contact`);
      const seated = await checkpoint('coast-seated');
      if (process.env.SIDE_PROOF) await seatProof();
      assert.ok(seated.player.seated && seated.companion.seated); assert.ok(seated.outing.stops.includes('coast'));
      await continueSave('east_coast'); await ready();
      const continued = await checkpoint('coast-continue');
      const restoredContacts = await page.evaluate(async () => (await import('./tools/outing-seat-contact.mjs')).outingSeatContact(globalThis.__game));
      report.push({ case: 'restored-bench-contact', contacts: restoredContacts });
      for (const contact of restoredContacts) assert.ok(Math.abs(contact.gap) < .03, `${contact.who} restored bench contact`);
      assert.deepEqual(continued.outing, seated.outing); assert.ok(continued.player.seated && continued.companion.seated);
      for (const who of ['player', 'companion']) assert.ok(Math.hypot(...continued[who].position.map((n, i) => n - seated[who].position[i])) < 0.03, `${who} seat restored`);
      await page.evaluate(() => globalThis.__game.outing.keepWalking()); await ready();
      const standing = await checkpoint('keep-walking'); assert.ok(!standing.player.seated && !standing.companion.seated);
      for (const name of ['plaza', 'east_lane', 'east_coast']) {
        const moving = samples.filter(s => s.place === name && s.visible && s.walking);
        assert.ok(moving.length > 1, `${name} has visible companion motion`);
      }
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests.filter(r => r.status >= 400), []);
    console.log('PASS', stem);
  } catch (error) {
    report.push({ failure: error.stack, phase });
    try { await checkpoint('failure'); } catch { /* startup can fail before game exists */ }
    throw error;
  } finally {
    const receipts = await Promise.allSettled(receiptJobs);
    for (const result of receipts) if (result.status === 'rejected') errors.push('Source receipt: ' + result.reason.message);
    fs.writeFileSync(`${out}/${stem}.json`, JSON.stringify({ cameraTrial: process.env.TRIAL_HEIGHT ? { height: +process.env.TRIAL_HEIGHT, minDistance: 4 } : null, loadedHashes, mode, width, mc, base, publicOnly: true, privateMode: false, hashes, report, errors, requests, samples }, null, 2));
    closing = true; await context.close();
  }
}, gpuWaitOptions(900, 295000));
