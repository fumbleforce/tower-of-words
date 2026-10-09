// Who stands where in a conversation (Jørgen, 2026-10-09: "put MC on the left, facing towards the chat, with opposing
// character on the right facing left to the chat"). For each cast member the page plays a line from them and one from
// the protagonist, then a three-person exchange, and checks that the protagonist's portrait is on the left half, the
// other speaker's on the right half, and that each is mirrored exactly when FACING (ui/portrait-data.js) says its
// source picture looks away from the text. Look at the pictures for the facing itself.
//   node game3d/tools/dialogue-sides.mjs [w] [h] [mc]
//   writes game3d/shots/dialogue-sides/<mc>-<w>x<h>/
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const [W = '1366', H = '860', MCID = 'eric'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/dialogue-sides/${MCID}-${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const CAST = ['mio', 'kenji', 'kuro', 'rei', 'mori', 'aoi', 'emi', 'guard', 'kuroda'];
const res = [];
await withBrowserJob('dialogue-sides', async (b) => {
  const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${base}/index.html?shell=talk&place=gate&skip&q=0&mc=${MCID}`);
  await p.waitForFunction(() => globalThis.window.__shellReady, null, { timeout: 120000 });
  const { FACING } = await import(path.join(G, 'js/ui/portrait-data.js'));
  const mcSet = MCID; // data/mc/<id>.json portrait.set matches the id for every protagonist so far
  await p.evaluate(() => (globalThis.window.__game.runner.trigger = () => false));
  const say = (who, text) =>
    p.evaluate(
      ([who, text]) => void globalThis.window.__game.ui.say({ name: who, color: '#9fd3cc' }, text, { whoId: who }),
      [who, text],
    );
  // every shown portrait settled and loaded
  const settle = () =>
    p.waitForFunction(
      () =>
        [...globalThis.document.querySelectorAll('#stage .por:not([hidden])')].every(
          (e) => !e.classList.contains('wait') && e.querySelector('img').complete,
        ),
      null,
      { timeout: 15000 },
    );
  const shown = () =>
    p.evaluate(() =>
      [...globalThis.document.querySelectorAll('#stage .por:not([hidden])')].map((e) => {
        const r = e.getBoundingClientRect();
        return { who: e.dataset.who, mid: r.x + r.width / 2, mirror: e.classList.contains('mirror'), listen: e.classList.contains('listen') };
      }),
    );
  const check = (label, pors, expect) => {
    for (const [who, side] of Object.entries(expect)) {
      const el = pors.find((x) => x.who === who);
      const onLeft = el && el.mid < +W / 2;
      const want = (FACING[who] || 'front') === (side === 'left' ? 'left' : 'right');
      res.push({
        test: `${label}: ${who} on the ${side}${want ? ', mirrored' : ''}`,
        pass: !!el && onLeft === (side === 'left') && el.mirror === want,
        detail: el ? `centre ${Math.round(el.mid)} of ${W}, mirror ${el.mirror}` : 'not shown',
      });
    }
  };
  for (const who of CAST) {
    await say(who, `A line from ${who}, the other side of the conversation.`);
    await settle();
    await p.waitForTimeout(350);
    await p.screenshot({ path: path.join(out, `${who}.png`) });
    check(who, await shown(), phone ? { [who]: 'right' } : { [who]: 'right', [mcSet]: 'left' });
    if (phone || who === 'mio') {
      await say('eric', `And the protagonist answers ${who}.`);
      await settle();
      await p.waitForTimeout(350);
      if (who === 'mio') await p.screenshot({ path: path.join(out, `${who}-mc-speaks.png`) });
      check(`${who}, protagonist speaking`, await shown(), phone ? { [mcSet]: 'left' } : { [mcSet]: 'left', [who]: 'right' });
    }
    await p.evaluate(() => globalThis.window.__game.ui.closeTalk());
  }
  // three people: Mio, then the protagonist, then Kenji joins; Kenji takes the right, Mio steps out
  await say('mio', 'Kenji, come and meet our new hire.');
  await settle();
  await say('eric', 'Hello.');
  await settle();
  await say('kenji', 'Hi! I sit across from you.');
  await settle();
  await p.waitForTimeout(350);
  await p.screenshot({ path: path.join(out, 'three-kenji.png') });
  check('three people, Kenji speaking', await shown(), phone ? { kenji: 'right' } : { kenji: 'right', [mcSet]: 'left' });
  await say('mio', 'He fixes the printers.');
  await settle();
  await p.waitForTimeout(350);
  await p.screenshot({ path: path.join(out, 'three-mio.png') });
  check('three people, Mio again', await shown(), phone ? { mio: 'right' } : { mio: 'right', [mcSet]: 'left' });
  res.push({ test: 'no page errors', pass: !errs.length, detail: errs.join(' | ') });
});
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}  ${r.detail}`);
console.log(`artifacts: ${out}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
