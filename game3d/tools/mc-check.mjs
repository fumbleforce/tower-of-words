// Another protagonist from the title to the gate (docs/game/systems.md, Protagonists; #252).
//   node game3d/tools/mc-check.mjs [w h] [--mc <id>] [--cast <set or role=person,...>]     (npm run check:mc)
// Carina by default; no size runs 390x844 and 1366x860. Per size: the title with ?mc=, Start, the train played by the
// fast test's driver (js/testmode.js) with the scene fast-forwarded, on to the gate. It fails when
//  - the player's lines are spoken under another name than the protagonist's,
//  - the autosave doesn't keep the protagonist (`mc`) or the cast asked for,
//  - the player leaves the frame in the first seconds on the train or on arriving at the gate (test/support/framing.mjs,
//    as loop-check.mjs checks arrivals),
//  - or the seat check (seat-check.mjs, ONLY=train,gate with the same ?mc=) fails for the player's body.
// BASE=<path to game3d> for a worktree. Stills of the train and the gate go to game3d/shots/mc/<mc>-<w>x<h>-*.png.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openGame } from '../test/support/open-game.mjs';
import { mcArgs } from '../test/support/mc-args.mjs';
import { worstFraming } from '../test/support/framing.mjs';
import { PROTAGONISTS } from '../js/mc.js';
import { defaultCast } from '../js/roles.js';
import { KEYS } from '../js/saves/store.js';

const opts = mcArgs();
const who = opts.mc ? opts : mcArgs(['--mc', 'carina', ...(opts.spec ? ['--cast', opts.spec] : [])], {});
const NAME = PROTAGONISTS[who.mc].name;
const CAST = (who.cast || defaultCast()).roles;
const sizes = opts.rest.length >= 2 ? [[+opts.rest[0], +opts.rest[1]]] : [[390, 844], [1366, 860]];
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const base = process.env.BASE || 'game3d';
const out = path.join(G, 'shots/mc');
fs.mkdirSync(out, { recursive: true });
const FRAME_MS = 5000; // as loop-check: the walk in and the camera letting go
const fails = [];

async function one(browser, W, H) {
  const tag = `${who.mc}-${W}x${H}`,
    phone = W < 700,
    bad = (m) => fails.push(`${W}x${H}: ${m}`);
  const game = await openGame(browser, {
    mode: 'title',
    viewport: { width: W, height: H },
    touch: phone,
    url: `http://127.0.0.1:${process.env.PORT || 8771}/${base}/index.html?q=0${who.query}`,
  });
  const { page } = game;
  try {
    // every line the player speaks, under which name
    await page.evaluate(async () => {
      const { ui } = await import(new URL('js/ui.js', location.href));
      const said = (window.__mcSaid = []);
      const say = ui.say;
      ui.say = function (speaker, text, o = {}) {
        if (o.whoId === 'eric' || o.whoId === 'player') said.push(speaker?.name ?? null);
        return say.apply(this, arguments);
      };
    });
    if (phone) await page.locator('#title .go').tap();
    else await page.locator('#title .go').click();
    await page.waitForFunction(() => window.__game?.place?.name === 'train' && !document.body.classList.contains('at-title'));
    // the opening on the train, at its own speed
    const train = await worstFraming(page, FRAME_MS);
    if (train.out > 1) bad(`player out of frame on the train ${train.at} ms after Start (at ${train.x}, ${train.y})`);
    await page.screenshot({ path: path.join(out, `${tag}-train.png`) });
    // then the fast test's driver plays on, fast-forwarded, until the gate
    await page.evaluate(async () => {
      (await import(new URL('js/testmode.js', location.href))).start(window.__game);
      window.__mcHurry = setInterval(() => window.__game.setHurry(true), 30);
    });
    await page.waitForFunction(() => window.__game.place?.name === 'gate', null, { timeout: 150000 });
    await page.evaluate(() => {
      clearInterval(window.__mcHurry);
      window.__game.setHurry(false);
    });
    const gate = await worstFraming(page, FRAME_MS);
    if (gate.out > 1) bad(`player out of frame ${gate.at} ms after arriving at the gate (at ${gate.x}, ${gate.y})`);
    await page.screenshot({ path: path.join(out, `${tag}-gate.png`) });
    const r = await page.evaluate(
      (key) => ({ said: window.__mcSaid, save: JSON.parse(localStorage.getItem(key) || 'null'), errors: window.__test?.errors || [] }),
      KEYS.SAVE,
    );
    const names = [...new Set(r.said)];
    if (!r.said.length) bad('the player spoke no line on the way to the gate');
    else if (names.some((n) => n !== NAME)) bad(`the player's lines were spoken as ${names.join(', ')}, not ${NAME}`);
    if (r.save?.mc !== who.mc) bad(`the save has mc: ${r.save?.mc}, not ${who.mc}`);
    if (JSON.stringify(r.save?.cast?.roles) !== JSON.stringify(CAST)) bad(`the save's cast is ${JSON.stringify(r.save?.cast?.roles)}`);
    for (const e of [...r.errors, ...game.errors]) bad('page error: ' + e);
    console.log(
      `${W}x${H}: ${r.said.length} player lines as ${names.join(', ') || '-'}; save mc ${r.save?.mc}; framing train ${train.out.toFixed(2)}, gate ${gate.out.toFixed(2)}`,
    );
  } finally {
    await game.close();
  }
}

await withBrowserJob('mc-check', async (browser) => {
  for (const [W, H] of sizes) await one(browser, W, H).catch((e) => fails.push(`${W}x${H}: ${e.message.split('\n')[0]}`));
}, { timeoutMs: 280000 * sizes.length });
// the player's body on the train's seats and the gate's bench, as this protagonist
for (const [W, H] of sizes) {
  try {
    const log = execFileSync('node', [path.join(G, 'tools/seat-check.mjs'), String(W), String(H)], {
      encoding: 'utf8',
      env: { ...process.env, ONLY: 'train,gate', QS: who.query, SHOTS: process.env.SHOTS ?? '1' },
    });
    console.log(`seats ${W}x${H}: ` + log.trim().split('\n').at(-1));
  } catch (e) {
    fails.push(`${W}x${H} seat check: ${(e.stdout || e.message).trim().split('\n').slice(-4).join(' | ')}`);
  }
}
console.log(fails.length ? `FAIL ${who.label}\n` + fails.join('\n') : `PASS ${who.label}`, `(${out})`);
process.exitCode = fails.length ? 1 : 0;
