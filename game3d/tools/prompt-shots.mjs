// A still of every prompt and choice that waits on the player in the day (typed words and reply choices), with a
// check that no dialogue portrait covers Eric while it waits (issue #76).
//   node game3d/tools/prompt-shots.mjs [w] [h]        (BASE=.claude/worktrees/<name>/game3d for a worktree)
// The day plays itself (?test=fast). At each typePrompt/choose the page shows it as a player sees it (not the
// auto-answer), waits for the camera to settle, measures Eric's box on screen against every visible portrait's box,
// shoots, then answers as the test would. Output: game3d/shots/prompts/<w>x<h>/ (JPEG and report.json).
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';

const [W = '390', H = '844'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, `shots/prompts/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const rows = [];
let errors = [];

function inPage() {
  const hook = () => {
    const g = globalThis.__game;
    if (!g || !g.ui || !g.player || g.__promptHooked) return setTimeout(hook, 50);
    g.__promptHooked = true;
    const measure = () => {
      const e = g.ericBox ? g.ericBox() : null,
        keep = g.promptKeep ? g.promptKeep() : [];
      const pors = [...globalThis.document.querySelectorAll('#stage:not([hidden]) .por:not([hidden])')].map((el) => {
        // the box the body covers (ui/portraits.js), else the whole picture
        const r = el._body || el.getBoundingClientRect(),
          cs = globalThis.getComputedStyle(el);
        return {
          who: el.dataset.who,
          side: el.classList.contains('left') ? 'L' : 'R',
          x0: r.x0 ?? r.left,
          x1: r.x1 ?? r.right,
          y0: r.y0 ?? r.top,
          y1: r.y1 ?? r.bottom,
          op: +cs.opacity,
        };
      });
      const talk = globalThis.document.querySelector('#talk').getBoundingClientRect();
      // Eric first, then the Say target during "Say it to ..."
      const hit = pors
        .filter((p) => p.op > 0.05)
        .flatMap((p) =>
          keep
            .map((b, i) =>
              p.x0 < b.x1 && p.x1 > b.x0 && p.y0 < b.y1 && p.y1 > b.y0 ? `${p.who} over ${i ? 'target' : 'Eric'}` : '',
            )
            .filter(Boolean),
        );
      return {
        place: g.place.name,
        eric: e,
        pors,
        talkTop: talk.top,
        talkShown: !globalThis.document.querySelector('#talk').hidden && talk.height > 0,
        overlay: [...globalThis.document.querySelectorAll('body > *')]
          .filter(
            (x) =>
              globalThis.getComputedStyle(x).position === 'fixed' &&
              x.offsetWidth >= globalThis.innerWidth &&
              globalThis.getComputedStyle(x).display !== 'none',
          )
          .map((x) => x.id || x.className)
          .join(','),
        hit,
        ericUnderTalk: !!e && e.y1 > talk.top && e.x1 > talk.left && e.x0 < talk.right,
      };
    };
    for (const k of ['typePrompt', 'choose']) {
      const f = g.ui[k].bind(g.ui);
      g.ui[k] = async (...a) => {
        const auto = g.ui.auto;
        g.ui.auto = false; // shown as a player sees it
        const pr = f(...a);
        const from = (new Error().stack.split('\n')[2] || '').replace(/.*\/js\//, '').replace(/\)$/, '');
        await new Promise((r) => setTimeout(r, 1600));
        const tag = String(k === 'typePrompt' ? a[0] : a[1] || '')
          .replace(/<[^>]+>|\{|\}/g, '')
          .replace(/[^\w]+/g, '_')
          .slice(0, 24);
        await globalThis.__promptShot(`${g.place.name}-${k === 'typePrompt' ? 'type' : 'choose'}-${tag}`, {
          ...measure(),
          from,
        });
        g.ui.auto = auto;
        if (k === 'typePrompt') {
          const t = globalThis.document.querySelector('#talk .tp-in');
          if (t) {
            t.value = t.getAttribute('aria-label').replace(/^Type /, '');
            t.dispatchEvent(new globalThis.Event('input', { bubbles: true }));
          }
        } else {
          const btns = [...globalThis.document.querySelectorAll('#talk .chips .chip')];
          btns[Math.min(btns.length - 1, g.ui.autoPick ? g.ui.autoPick(a[2]) : 0)]?.click();
        }
        return pr;
      };
    }
  };
  hook();
}

await withBrowserJob(
  'prompt-shots',
  async (browser) => {
    const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0`;
    const game = await openGame(browser, {
      viewport: { width: +W, height: +H },
      mode: 'fast',
      url,
      touch: +W < 700,
      beforeNavigate: async (p) => {
        let n = 0;
        await p.exposeFunction('__promptShot', async (name, info) => {
          const file = `${String(++n).padStart(2, '0')}-${name}.jpg`;
          await p.screenshot({
            path: path.join(out, file),
            type: 'jpeg',
            quality: 80,
          });
          rows.push({ file, ...info });
        });
        await p.addInitScript(inPage);
      },
    });
    errors = game.errors;
    await game.page
      .waitForFunction(() => globalThis.__test?.done, null, { timeout: 270000 })
      .catch(async (e) => {
        errors.push('route: ' + e.message.split('\n')[0]);
        await game.page.screenshot({
          path: path.join(out, 'zz-stalled.jpg'),
          type: 'jpeg',
          quality: 80,
        });
        errors.push(
          await game.page.evaluate(() =>
            JSON.stringify({
              test: globalThis.__test,
              talk: globalThis.document.querySelector('#talk').innerText.slice(0, 200),
            }),
          ),
        );
      });
  },
  { timeoutMs: 295000 },
);
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(rows, null, 1));
const box = (b) => (b ? `${b.x0.toFixed(0)}-${b.x1.toFixed(0)}x${b.y0.toFixed(0)}-${b.y1.toFixed(0)}` : '?');
let bad = 0;
for (const r of rows) {
  if (r.hit.length) bad++;
  console.log(
    `${r.file.padEnd(46)} ${r.hit.length ? 'COVERS: ' + r.hit.join(', ') : 'ok'}${r.ericUnderTalk ? ' (Eric under the talk box)' : ''}` +
      `  eric=${box(r.eric)} ${r.pors.map((p) => `${p.who}${p.side}=${box(p)} o${p.op}`).join(' ')}`,
  );
}
if (errors.length) console.log('page errors:', errors.slice(0, 5).join(' | '));
console.log(
  `${rows.length} prompts, ${bad} with a portrait over Eric or the target -> ${path.relative(path.dirname(G), out)}`,
);
process.exit(bad || errors.length ? 1 : 0);
