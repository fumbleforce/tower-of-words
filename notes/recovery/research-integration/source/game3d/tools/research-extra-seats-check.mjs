import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 390), mc = width < 700 ? 'carina' : 'eric';
const base = new URL((process.env.BASE || 'game3d') + '/', `http://127.0.0.1:${process.env.PORT || 8771}/`).href;
const out = `/tmp/codex-research-extra-seats-${process.env.ROUND || '1'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('research-extra-seats', async browser => {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 860 } });
  const page = await context.newPage(), checks = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: false, privateMode: false })));
  const idle = async () => {
    for (let i=0;i<450;i++) {
      if(errors.length) throw Error(errors[0]);
      if(await page.evaluate(()=>!globalThis.__game.busy)) return;
      await page.waitForTimeout(200);
    }
    throw Error('Research activity timed out');
  };
  const shot = label => page.screenshot({ path: `${out}/${width}-${label}.png` });
  async function use(id, choice) {
    await page.evaluate(({ id, choice }) => {
      const g = globalThis.__game;
      g.ui.auto = true;
      g.ui.autoPick = () => g.runner.lastStep.choice.filter(x => !x.if || globalThis.__researchCond(x.if)).findIndex(x => x.text === choice);
      g.use({ id, ...g.place.things[id] });
    }, { id, choice });
  }
  async function state() {
    return page.evaluate(async () => {
      const g = globalThis.__game, p = g.place, s = p.research.state.read(), seat = p.seats[s.active.seat];
      const { TABLE_PAGES, SHELF } = await import('./js/scenes/research-room/plan.js');
      const book = p.space.getObjectByName('research-book:weather'), other = p.space.getObjectByName('research-book:copier');
      return { state: s, seated: g.player.seated, atSeat: Math.hypot(g.player.root.position.x - seat.x, g.player.root.position.z - seat.z), book: book.position.toArray(), expected: TABLE_PAGES[s.active.seat], shelf: other.position.toArray(), expectedShelf: SHELF.copier, known: (await import('./js/lang.js')).known.has('shiryou') };
    });
  }
  function validate(s, seat) {
    assert.equal(s.state.active.seat, seat);
    assert.equal(s.state.active.book, 'weather');
    assert.equal(s.state.pages.weather, 1); assert.equal(s.state.marks.weather, 1);
    assert.equal(s.seated, true); assert.ok(s.atSeat < .01);
    assert.deepEqual(s.book, s.expected); assert.deepEqual(s.shelf, s.expectedShelf);
    assert.equal(s.known, false);
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`${base}index.html?day=2&place=research_lab&mc=${mc}`), 'play');
    await idle();
    await page.evaluate(async () => { globalThis.__researchCond = (await import('./js/narrative/state.js')).cond; });
    await use('research_archive', 'Weather instruments · reading table');
    await page.getByRole('button', { name: 'Next page', exact: true }).click({ timeout: 90000 });
    await page.getByRole('button', { name: 'Mark this page', exact: true }).click();
    await page.getByRole('button', { name: 'Close book view', exact: true }).click();
    await idle();
    for (const seat of ['research_side_seat', 'research_end_seat']) {
      await use(seat); await idle();
      const before = await state(); validate(before, seat); await shot(seat);
      await use('research_archive', 'Read the open book.');
      await page.getByRole('button', { name: 'Close book view', exact: true }).waitFor({ timeout: 90000 });
      const reading = await state(); validate(reading, seat);
      await page.getByRole('button', { name: 'Close book view', exact: true }).click(); await idle();
      if (width < 700) await page.locator('#qsaveBtn').click(); else await page.keyboard.press('F5');
      await page.waitForTimeout(350); await page.goto(`${base}index.html`);
      await page.locator('#title .mcont').click(); await page.locator('.slot[data-id="quick"]').click();
      await page.waitForFunction(() => globalThis.__game?.place?.name === 'research_lab' && !globalThis.document.body.classList.contains('at-title'), null, { timeout: 90000 });
      await idle(); await page.waitForFunction(() => !['at-title', 'title-cont', 'title-leaving', 'loading'].some(c => globalThis.document.body.classList.contains(c))); await page.locator('#title').waitFor({ state: 'hidden' }); await page.locator('#boot').waitFor({state:'detached'}); await page.waitForTimeout(250); const after = await state(); validate(after, seat); assert.deepEqual(after, before);
      await shot(seat + '-continued');
      const contact = await page.evaluate(async () => {const g=globalThis.__game,p=g.place,{researchSeatContact}=await import('./test/support/research-seat-contact.mjs');return researchSeatContact(p,g.player,[g.player,...Object.values(p.people)]);});
      assert.ok(contact.gap>=-.012&&contact.gap<=.001, 'rendered cushion contact after Continue');
      await page.evaluate(() => {const g=globalThis.__game,p=g.place,s=p.seats[p.research.state.read().active.seat];g.busy=true;p.research.camera.focus([s.x,s.z-.12],{distance:2.3,height:.4,yaw:-.7,elev:.55});});
      await page.waitForTimeout(300);await shot(seat+'-continued-detail');
      const detail = await page.evaluate(async()=>{const T=await import('three'),g=globalThis.__game,c=g.place.cam,v=g.player.root.getWorldPosition(new T.Vector3());return{position:c.camera.position.toArray(),target:c.target.toArray(),dir:c.dir.toArray(),close:c.close,player:v.toArray(),screen:v.add(new T.Vector3(0,.5,0)).project(c.camera).toArray()};});
      assert.ok(Math.abs(detail.screen[0])<1&&Math.abs(detail.screen[1])<1&&detail.screen[2]>-1&&detail.screen[2]<1,'restored sitter visible in diagnostic contact view');
      await page.evaluate(()=>{globalThis.__game.place.research.camera.release();globalThis.__game.busy=false;});
      checks.push({ before, reading, after, contact, detail, veilCleared:true });
      await page.evaluate(async () => { globalThis.__researchCond = (await import('./js/narrative/state.js')).cond; });
    }
    assert.deepEqual(errors, []);
  } catch (error) {
    checks.push({ failure: error.stack, contacts: await page.evaluate(() => globalThis.__game?.place?.research?.hands.contacts) });
    await shot('failure'); throw error;
  } finally {
    fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ checks, errors }, null, 2));
    await context.close();
  }
}, { timeoutMs: 300000, gpuWaitMs: 1200000 });
