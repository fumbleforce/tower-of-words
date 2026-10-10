// The new Kuro and Mio faces (reviews/expressions-kuro-mio-1) show in real story nodes: runs each node, holds on the
// first line that names the face, and saves the frame.
//   node game3d/tools/expr-faces-check.mjs [w] [h]      writes game3d/shots/expr-faces/<w>x<h>/<face>.png
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/expr-faces/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
// [who, face, story file, node, flags the node needs]; the talk shell only loads the gate's story, so each node's file is added to it
const CASES = [
  ['kuro', 'polite', 'forecourt.js', 'kuro_intro'],
  ['kuro', 'teasing', 'day3/pool.js', 'd3_kuro_pool', ['d3_kuro_intro']],
  ['kuro', 'teasing', 'clubs.js', 'club_swimming_pool'],
  ['kuro', 'teasing', 'conversations/register.js', 'register_kuro_right_2'],
  ['kuro', 'teasing', 'day2/forecourt.js', 'd2_kuro_ok'],
  ['kuro', 'pleased', 'day5/reception.js', 'd5_label'], // the "all in" branch: the ticket is done
  ['mio', 'annoyed', 'day2/office.js', 'd2_mio_work', ['d2_mio_job_talked', 'd2_mio_weekend_talked']],
  ['kuro', 'flirtatious', null, null], // no scene: shown straight through the dialogue box
];
const res = [];
await withBrowserJob('expr-faces-check', async (b) => {
  for (const [who, face, file, node, flagList = []] of CASES) {
    const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`${base}/index.html?shell=talk&place=gate&skip&q=0`);
    await p.waitForFunction(() => globalThis.__shellReady, null, { timeout: 120000 });
    const r = await p.evaluate(async ([who, face, file, node, root, flagList]) => {
      const g = globalThis.__game;
      g.runner.trigger = () => false;
      globalThis.__seen = [];
      const say = g.ui.say.bind(g.ui);
      const hold = new Promise((ok) => (globalThis.__hold = ok));
      g.ui.say = (...a) => {
        const o = a[2] || {};
        globalThis.__seen.push(`${o.whoId}:${o.face}`);
        if (o.whoId === who && o.face === face) { say(...a); globalThis.__hold(true); return new Promise(() => {}); }
        return Promise.resolve();
      };
      if (node) {
        const { flags } = await import(`${root}/js/narrative/state.js`);
        for (const f of flagList) flags[f] = true;
        const m = await import(`${root}/story/${file}`);
        const nodes = m.default?.nodes || m.receptionNodes;
        Object.assign(g.runner.story.nodes, nodes);
        let id = node;
        if (node === 'd5_label') {
          g.runner.story.nodes.__pleased = nodes.d5_label.find((x) => x.then && JSON.stringify(x.then).includes("'pleased'") || JSON.stringify(x.then || '').includes('pleased')).then;
          id = '__pleased';
        }
        g.runner.run(id);
      } else {
        say({ name: 'Kuro', color: '#c3a7d6' }, 'Come here a moment.', { whoId: who, face });
        globalThis.__hold(true);
      }
      return Promise.race([hold, new Promise((ok) => setTimeout(() => ok(false), 15000))]);
    }, [who, face, file, node, base, flagList]);
    await p.waitForTimeout(1500);
    const por = await p.evaluate(() => [...globalThis.document.querySelectorAll('#stage .por')].filter((e) => !e.hidden).map((e) => `${e.dataset.who}:${e.dataset.face}`));
    const shot = path.join(out, `${who}-${face}${node ? '-' + node : ''}.png`);
    await p.screenshot({ path: shot });
    const row = { who, face, node, reached: r, shown: por, errs, seen: r ? undefined : await p.evaluate(() => globalThis.__seen) };
    res.push(row);
    console.log(JSON.stringify(row));
    await p.close();
  }
}, gpuWaitOptions(900, 200000));
const bad = res.filter((r) => !r.reached || !r.shown.includes(`${r.who}:${r.face}`) || r.errs.length);
console.log(bad.length ? 'FAIL ' + bad.length : 'PASS all faces shown');
process.exit(bad.length ? 1 : 0);
