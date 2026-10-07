// Native log UI with recorded-remark fixtures; no claim of playing their authored story routes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || `game3d/shots/memory-comparison/${Date.now()}`;
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], viewports: [] };
await withBrowserJob('memory-comparison', async browser => {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 860 }, hasTouch: width === 390, isMobile: width === 390 });
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => report.errors.push(e) }));
    const page = await context.newPage();
    const capture = async name => {
      await page.waitForFunction(() => +globalThis.getComputedStyle(globalThis.document.querySelector('.vnlog')).opacity > 0.99);
      await page.waitForTimeout(220);
      await page.screenshot({ path: `${out}/${width}-${name}.png` });
    };
    page.on('pageerror', e => report.errors.push(e.message));
    await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' })));
    try {
      await waitForGame(page, 90000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&day=2&place=plaza&q=2`), 'play');
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.evaluate(async () => {
        const log = await import('./js/ui/backlog.js');
        const { known } = await import('./js/lang.js');
        const { conversationMemory } = await import('./js/conversations/state.js');
        log.logLoad(null, 2); known.clear();
        const g = globalThis.__game;
        g.sim.day = 2;
        log.logLine({ k: 'line', who: 'mori', name: 'Mr. Mori', text: '1994年に行ったんです。また行きたいですね。', ov: true, clear: [{ ja: '1994年', en: '1994' }] });
        globalThis.__memoryUI = { log, known, conversationMemory, original: JSON.stringify(log.logToJSON()) };
        log.openLog({ sayWord() {}, closed() {} });
      });
      await page.locator('.vnlog .memories').click();
      assert.equal(await page.locator('.reading-before').count(), 0);
      await capture('before-learning');
      await page.evaluate(() => {
        const { log, known, original } = globalThis.__memoryUI;
        log.closeLog(); log.logLoad(JSON.parse(original), 9); known.add('ikitai');
        log.openLog({ sayWord() {}, closed() {} });
      });
      await page.locator('.vnlog .memories').click();
      assert.equal(await page.locator('.reading-before').count(), 1);
      assert.equal(await page.locator('.reading-before[open]').count(), 0);
      await capture('current-reading');
      if (width === 390) await page.locator('.reading-before summary').tap();
      else {
        for (let n = 0; n < 8 && !await page.locator('.reading-before summary').evaluate(el => el === globalThis.document.activeElement); n++) await page.keyboard.press('Tab');
        assert.equal(await page.locator('.reading-before summary').evaluate(el => el === globalThis.document.activeElement), true);
        await page.keyboard.press('Enter');
      }
      assert.equal(await page.locator('.reading-before[open]').count(), 1);
      const check = await page.evaluate(() => {
        const doc = globalThis.document, li = doc.querySelector('.vnlog li');
        const original = li.querySelector('.reading-before .tx');
        const { known, log } = globalThis.__memoryUI;
        return {
          width: globalThis.innerWidth,
          originalKnown: [...original.querySelectorAll('.jp.clear')].map(e => e.textContent),
          currentKnown: [...li.querySelector('.bd > .tx').querySelectorAll('.jp.clear')].map(e => e.textContent),
          originalGloss: original.textContent.includes('1994'),
          savedVocabulary: log.logToJSON().memories.records[0].knownAtTime,
          vocabulary: [...known],
          overflow: [...doc.querySelectorAll('.vnlog .sheet, .vnlog .bd')].some(e => e.scrollWidth > e.clientWidth + 1),
          targetHeight: li.querySelector('summary').getBoundingClientRect().height,
        };
      });
      assert.deepEqual(check.originalKnown, []);
      assert.deepEqual(check.currentKnown, ['行きたい']);
      assert.deepEqual(check.savedVocabulary, []);
      assert.deepEqual(check.vocabulary, ['ikitai']);
      assert(check.originalGloss && !check.overflow && check.targetHeight >= 44);
      report.viewports.push(check);
      await capture('comparison-open');
      // Exercise the actual controller callback, with an injected standard gamepad.
      await page.evaluate(() => {
        const pad = { buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
        Object.defineProperty(globalThis.navigator, 'getGamepads', { configurable: true, value: () => [pad] });
        globalThis.__testPad = pad;
        globalThis.document.querySelector('.vnlog .ls').focus();
        globalThis.dispatchEvent(new globalThis.Event('gamepadconnected'));
      });
      for (let n = 0; n < 3; n++) {
        await page.evaluate(() => { globalThis.__testPad.buttons[15].pressed = true; });
        await page.waitForTimeout(70);
        await page.evaluate(() => { globalThis.__testPad.buttons[15].pressed = false; });
        await page.waitForTimeout(70);
      }
      assert.equal(await page.locator('.reading-before summary').evaluate(el => el === globalThis.document.activeElement), true);
      await page.evaluate(() => { globalThis.__testPad.buttons[0].pressed = true; });
      await page.waitForFunction(() => !globalThis.document.querySelector('.reading-before').open);
      await page.evaluate(() => { globalThis.__testPad.buttons[0].pressed = false; });
      await page.waitForTimeout(70);
      for (let n = 0; n < 2; n++) {
        await page.evaluate(() => { globalThis.__testPad.buttons[14].pressed = true; });
        await page.waitForTimeout(70);
        await page.evaluate(() => { globalThis.__testPad.buttons[14].pressed = false; });
        await page.waitForTimeout(70);
      }
      assert.equal(await page.locator('.vnlog .x').evaluate(el => el === globalThis.document.activeElement), true);
      await page.evaluate(() => { globalThis.__testPad.buttons[0].pressed = true; });
      await page.waitForFunction(() => globalThis.document.querySelector('.vnlog').hidden);
      await page.evaluate(() => {
        Object.defineProperty(globalThis.navigator, 'getGamepads', { configurable: true, value: () => [] });
        const { log, original } = globalThis.__memoryUI;
        const legacy = JSON.parse(original);
        for (const record of legacy.memories.records) record.knownAtTime = null;
        for (const record of legacy.items) record.knownAtTime = null;
        log.logLoad(legacy, 9); log.openLog({ sayWord() {}, closed() {} });
      });
      await page.locator('.vnlog .memories').click();
      assert.equal(await page.locator('.reading-before').count(), 0);
      await capture('legacy');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.vnlog').isVisible(), false);
      await page.evaluate(async () => {
        const { REMARKS } = await import('./story/conversations/remarks.js');
        const { log, known } = globalThis.__memoryUI;
        log.logLoad(null, 2); known.clear();
        for (const remark of REMARKS.filter(r => r.words.length))
          log.logLine({ k: 'line', who: remark.who, name: remark.name, text: remark.lines[0], ov: true });
        for (const word of ['mada', 'oishii', 'oyogu', 'ikitai', 'mouichido', 'yasumi', 'yoyaku']) known.add(word);
        log.openLog({ sayWord() {}, closed() {} });
      });
      await page.locator('.vnlog .memories').click();
      const summaries = page.locator('.reading-before summary');
      assert.equal(await summaries.count(), 9);
      await summaries.first().click();
      await page.evaluate(() => { globalThis.document.querySelector('.vnlog .ls').scrollTop = 0; });
      await capture('several-remarks');
      assert.equal(await page.evaluate(() => [...globalThis.document.querySelectorAll('.vnlog .bd')].some(e => e.scrollWidth > e.clientWidth + 1)), false);
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('.vnlog .x').evaluate(el => el === globalThis.document.activeElement), true);
      await page.keyboard.press('Space');
      assert.equal(await page.locator('.vnlog').isVisible(), false);
    } finally { closing = true; await context.close(); }
  }
});
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
assert.deepEqual(report.errors, []);
console.log('PASS remembered comparison, pointer/touch/keyboard/controller, legacy and no hidden-word reveal', out);
