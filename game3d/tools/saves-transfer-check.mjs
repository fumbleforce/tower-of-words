// Export and import on the saves screen, in the real game (docs/game/controls-and-ui.md, Saves): from the title's
// Continue, exports slot 5 (a save in the old record format, its picture still inside it) to a .amakawa-save file,
// imports that file into slot 7, refuses a file that isn't a save, then loads slot 7 and checks the game plays it.
//   node game3d/tools/saves-transfer-check.mjs [w] [h]    writes game3d/shots/saves-transfer/<w>x<h>/, PASS or FAIL
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fixture from '../test/fixtures/save-v1.json' with { type: 'json' };

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/saves-transfer/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};
const PIC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

await withBrowserJob('saves-transfer-check', async (b) => {
  const ctx = await b.newContext({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
    acceptDownloads: true,
  });
  await ctx.addInitScript(
    ({ data, pic }) => {
      if (sessionStorage.getItem('transfer-check-seeded')) return;
      localStorage.clear();
      localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
      localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
      // a slot as an older build wrote it: no version, the picture inside the record
      localStorage.setItem(
        'amakawa-slot-5',
        JSON.stringify({ data, place: data.place, period: data.period, at: Date.now() - 3600e3, line: 'Ask Mio', thumb: pic }),
      );
      sessionStorage.setItem('transfer-check-seeded', '1');
    },
    { data: fixture, pic: PIC },
  );
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  const note = () => p.locator('#saves .note').textContent();
  const waitNote = (re) =>
    p
      .waitForFunction((src) => new RegExp(src).test(document.querySelector('#saves .note')?.textContent || ''), re.source, {
        timeout: 8000,
      })
      .catch(() => {});

  await p.goto(`${base}/index.html`);
  await p.waitForSelector('#title .mcont', { state: 'visible', timeout: 60000 });
  await p.waitForTimeout(800);
  await p.locator('#title .mcont').click();
  await p.waitForSelector('#saves:not([hidden]) .slot[data-id="5"]');
  await p.waitForTimeout(500);
  check(await p.locator('#saves [data-x="export"]').isVisible(), 'Export is on the screen');
  check(await p.locator('#saves [data-x="import"]').isVisible(), 'Import is on the screen');
  check(!(await p.locator('#saves [data-x="cancel"]').isVisible()), 'Cancel is hidden until something is being chosen');
  await shot('1-continue');

  // export slot 5
  await p.locator('#saves [data-x="export"]').click();
  await waitNote(/Choose the save to export/);
  check(/Choose the save to export/.test(await note()), 'Export asks which save');
  check(await p.locator('#saves [data-x="cancel"]').isVisible(), 'Cancel shows while choosing');
  await shot('2-export-pick');
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 8000 }),
    p.locator('#saves .slot[data-id="5"]').click(),
  ]);
  const file = path.join(out, dl.suggestedFilename());
  await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  check(
    /\.amakawa-save$/.test(file) &&
      exported.format === 'amakawa-save' &&
      exported.slot?.data?.place === fixture.place &&
      exported.thumb === PIC,
    `slot 5 exported with its game and picture (${path.basename(file)})`,
  );
  await waitNote(/Exported Slot 5/);
  check(/Exported Slot 5/.test(await note()), 'the note says it was exported');

  // import it into slot 7
  const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.locator('#saves [data-x="import"]').click()]);
  await chooser.setFiles(file);
  await waitNote(/Choose a slot/);
  check(/Choose a slot for the imported save/.test(await note()), `Import asks which slot ("${await note()}")`);
  const shown = await p.evaluate(() => [...document.querySelectorAll('#saves .slot')].map((s) => s.dataset.id));
  check(!shown.includes('auto') && shown.includes('quick') && shown.includes('12'), 'Import offers the quick slot and slots 1 to 12');
  await shot('3-import-pick');
  await p.locator('#saves .slot[data-id="7"]').click();
  await waitNote(/Imported into Slot 7/);
  check(/Imported into Slot 7/.test(await note()), 'imported into slot 7');
  const [s5, s7] = await p.evaluate(() =>
    ['amakawa-slot-5', 'amakawa-slot-7'].map((k) => JSON.parse(localStorage.getItem(k) || 'null')),
  );
  check(!!s7 && JSON.stringify(s7.data) === JSON.stringify(s5.data), 'slot 7 holds the same game as slot 5');
  await p
    .waitForFunction(() => document.querySelector('#saves .slot[data-id="7"] .thumb img')?.naturalWidth > 0, null, {
      timeout: 5000,
    })
    .catch(() => {});
  check(
    await p.evaluate(() => document.querySelector('#saves .slot[data-id="7"] .thumb img')?.naturalWidth > 0),
    'slot 7 shows the imported picture',
  );
  await shot('4-imported');

  // a file that isn't a save
  const junk = path.join(out, 'not-a-save.amakawa-save');
  fs.writeFileSync(junk, '{"hello":1}');
  const [chooser2] = await Promise.all([p.waitForEvent('filechooser'), p.locator('#saves [data-x="import"]').click()]);
  await chooser2.setFiles(junk);
  await waitNote(/isn't an Amakawa save/);
  check(/isn't an Amakawa save/.test(await note()), 'a file that is not a save is refused');
  const after = await p.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => /^amakawa-slot-/.test(k))
      .sort(),
  );
  check(
    JSON.stringify(after) === JSON.stringify(['amakawa-slot-5', 'amakawa-slot-7']),
    `no slot was touched (${after.join(',')})`,
  );
  await shot('5-refused');
  const fit = await p.evaluate(() => {
    const r = document.querySelector('#saves .pane').getBoundingClientRect();
    const f = document.querySelector('#saves .sfoot').getBoundingClientRect();
    return { bottom: r.bottom, right: r.right, fb: f.bottom, fr: f.right, vw: innerWidth, vh: innerHeight };
  });
  check(
    fit.bottom <= fit.vh + 1 && fit.right <= fit.vw + 1 && fit.fb <= fit.bottom + 1 && fit.fr <= fit.right + 1,
    `the screen and its footer fit (${JSON.stringify(fit)})`,
  );

  // load the imported slot: the game plays it
  await p.locator('#saves .slot[data-id="7"]').click();
  await p
    .waitForFunction(
      (want) => window.__game?.place?.name === want && !document.body.classList.contains('at-title'),
      fixture.place,
      { timeout: 60000 },
    )
    .catch(() => {});
  const g = await p.evaluate(() => ({
    place: window.__game?.place?.name || null,
    title: document.body.classList.contains('at-title'),
  }));
  check(!g.title && g.place === fixture.place, `loading slot 7 plays the imported game (${JSON.stringify(g)})`);
  await p.waitForTimeout(1500);
  await shot('6-loaded');
  // in play the screen has its Save and Load tabs above the same Export and Import
  if (phone) await p.locator('#pauseBtn').tap();
  else await p.keyboard.press('Escape');
  await p.waitForSelector('#pause:not([hidden]) .save', { timeout: 10000 }).catch(() => {});
  await p.locator('#pause .save').click();
  await p.waitForSelector('#saves:not([hidden]) .slot[data-id="7"]', { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(500);
  check(
    (await p.locator('#saves .modes').isVisible()) && (await p.locator('#saves [data-x="export"]').isVisible()),
    'in play: Save and Load tabs, with Export and Import below',
  );
  await shot('7-in-play-save');
  check(!errs.length, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
});
console.log(`${fails.length ? 'FAIL' : 'PASS'} saves-transfer-check ${W}x${H} (${out})`);
process.exit(fails.length ? 1 : 0);
