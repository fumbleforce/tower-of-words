import { publicResearchContextOptions } from '../test/support/research-integration-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 390);
const base = new URL((process.env.BASE || 'game3d') + '/', `http://127.0.0.1:${process.env.PORT || 8771}/`).href;
const out = `/tmp/codex-research-papers-${process.env.ROUND || '1'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('research-papers', async browser => {
  const context = await publicResearchContextOptions(browser,{ viewport: { width, height: width < 700 ? 844 : 860 } });
  const page = await context.newPage(), checks = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: false, privateMode: false })));
  const idle = () => page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 90000 });
  async function settled(label) {
    await page.locator('#findView').waitFor({ state: 'visible', timeout: 90000 });
    await page.waitForFunction(() => {
      const p = globalThis.document.querySelector('#findView'), img = p?.querySelector('img');
      return img?.complete && img.naturalWidth > 0 && Number(globalThis.getComputedStyle(p).opacity) === 1;
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${width}-${label}.png` });
    return page.locator('#findView img').getAttribute('src');
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`${base}index.html?day=2&place=research_lab&mc=${width < 700 ? 'carina' : 'eric'}`), 'play');
    await idle();
    const retained = [];
    for (const [book, choice] of [['weather', 'Weather instruments · reading table'], ['copier', 'Copier · window chair']]) {
      await page.evaluate(choice => {
        const g = globalThis.__game;
        g.ui.auto = true;
        g.ui.autoPick = () => g.runner.lastStep.choice.findIndex(x => x.text === choice);
        g.use({ id: 'research_books', ...g.place.things.research_books });
      }, choice);
      for (let index = 0; index < 2; index++) {
        const src = await settled(`${book}-${index}-book`);
        const title = await page.locator('#findView .cap .t').textContent();
        await page.getByRole('button', { name: 'Save this reference', exact: true }).click();
        await page.locator('#findView .reference-saved').waitFor();
        retained.push({ book, index, src, title });
        if (!index) await page.getByRole('button', { name: 'Next page', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Mark this page', exact: true }).click();
      await page.getByRole('button', { name: 'Close book view', exact: true }).click();
      await idle();
    }
    await page.locator('#photosBtn').click();
    for (const reference of retained) {
      await page.locator('#photosPanel .paper-row').filter({ hasText: reference.title }).click();
      const savedSrc = await settled(`${reference.book}-${reference.index}-papers`);
      assert.equal(savedSrc, reference.src, 'Papers displays the exact illustration read in the volume');
      checks.push({ ...reference, savedSrc });
      await page.locator('#findView').click({ position: { x: 10, y: 120 } });
    }
    await page.locator('#photosPanel .close').click();
    const state = await page.evaluate(async () => ({ reading: globalThis.__game.place.research.state.read(), known: (await import('./js/lang.js')).known.has('shiryou') }));
    assert.equal(state.known, false, 'reading and retaining diagrams never teach the optional word');
    assert.deepEqual(state.reading.marks, { weather: 1, copier: 1 });
    checks.push(state);
    assert.deepEqual(errors, []);
  } catch (error) {
    checks.push({ failure: error.stack });
    await page.screenshot({ path: `${out}/${width}-failure.png` });
    throw error;
  } finally {
    fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ checks, errors }, null, 2));
    await context.close();
  }
}, { gpuWaitMs: Number(process.env.GPU_WAIT || 1800) * 1000, timeoutMs: 300000 });
