// A register reaction in the real game (issue #369): starts a day in a place, has Eric say a word to someone through
// the same path as the Say menu, and captures every line that comes up, then the People panel. Fails unless the
// person's reaction line (story/conversations/register.js) played and the People panel remembers it.
//   node game3d/tools/register-check.mjs <day> <place> <who> <word> [w] [h]
//   e.g. node game3d/tools/register-check.mjs 3 sports rei akete 390 844
// writes game3d/shots/register-check/<who>-<word>-<w>x<h>/, prints PASS or FAIL
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const [DAY = '3', PLACE = 'sports', WHO = 'rei', WORD = 'akete', W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/register-check/${WHO}-${WORD}-${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
let ok = true;

await withBrowserJob('register-check', async (b) => {
  const ctx = await b.newContext({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
  });
  await ctx.addInitScript(() => {
    globalThis.localStorage.clear();
    globalThis.localStorage.setItem(
      'amakawa-settings',
      JSON.stringify({
        textSpeed: 'instant',
        voiceOn: false,
        reduceMotion: true,
        skipChecks: true,
      }),
    );
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await waitForGame(p, 120000, () => p.goto(`${base}/index.html?day=${DAY}&place=${PLACE}`), 'play');
  await p.waitForFunction(() => !globalThis.__game.busy, null, {
    timeout: 60000,
  });
  const start = await p.evaluate(
    async ({ who, word }) => {
      const g = globalThis.__game;
      const L = await import(new URL('js/lang.js', globalThis.location.href).href);
      L.known.add(word);
      const t = g.markers.list.find((m) => m.id === who);
      if (!t) return { err: `no ${who} here` };
      const s = t.spot?.();
      if (s) g.player.root.position.set(s[0], g.player.root.position.y, s[1]);
      // the reaction comes on a Say that isn't right after another reaction
      g.sayWord(word, t);
      return { label: t.label };
    },
    { who: WHO, word: WORD },
  );
  if (start.err) throw new Error(start.err);
  // walk through every line that comes up, capturing each
  const seen = [];
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({
      busy: globalThis.__game.busy || globalThis.__game.saying,
      who: globalThis.document.querySelector('#talk .who')?.textContent?.trim() || '',
      text: globalThis.document.querySelector('#talk')?.hidden
        ? ''
        : globalThis.document.querySelector('#talk .line')?.textContent?.trim() || '',
    }));
    if (!st.busy && !st.text) break;
    if (st.text && seen.at(-1)?.text !== st.text) {
      seen.push(st);
      await p.screenshot({
        path: path.join(out, `${String(seen.length).padStart(2, '0')}.png`),
      });
      console.log(`     ${st.who}: ${st.text}`);
    }
    await p.evaluate(() => globalThis.__game.ui._advance?.());
  }
  const r = await p.evaluate(async (who) => {
    const S = await import(new URL('js/sim.js', globalThis.location.href).href);
    const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href).href);
    return {
      memory: JSON.stringify(S.bonds.person(who)).match(/register_\w+/g) || [],
      shown: Object.entries(flags).filter(([k]) => k.startsWith('regreact_')),
    };
  }, WHO);
  await p.evaluate(() => globalThis.document.querySelector('#peopleBtn')?.click());
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(out, 'people.png') });
  await p
    .locator(`#peoplePanel li[data-id="${WHO}"]`)
    .screenshot({ path: path.join(out, 'people-card.png') })
    .catch(() => {});
  console.log(`     flags ${JSON.stringify(r.shown)}; remembered ${r.memory.join(', ')}`);
  const shown = r.shown.some(([k, v]) => k.startsWith(`regreact_${WHO}_`) && k.endsWith('_shown') && v >= 1);
  if (!shown) ((ok = false), console.log(`FAIL no reaction from ${WHO}`));
  if (!r.memory.length) ((ok = false), console.log(`FAIL the People panel doesn't remember it`));
  if (errs.length) ((ok = false), console.log(`FAIL page errors: ${errs.join(' | ')}`));
}, { timeoutMs: 240000, gpuWaitMs: 900000 });
console.log(`${ok ? 'PASS' : 'FAIL'} register-check ${WHO} ${WORD} ${W}x${H}: ${out}`);
process.exit(ok ? 0 : 1);
