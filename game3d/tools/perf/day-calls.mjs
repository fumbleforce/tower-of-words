// Where the draw calls go over the whole day: plays the fast test's day (?test=fast, q0) and every 400 ms counts one
// frame's draws by pass (main, shadow) and kind (batch, person, thing, single, dynamic, transparent, other), per place.
// Prints per place the median frame's split and the objects outside a batch that draw most often.
//   node game3d/tools/perf/day-calls.mjs [w] [h] [--places train,gate,office] [--q 0]     BASE=<dir> for a worktree
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { openGame } from '../../test/support/open-game.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [W = 390, H = 844] = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')).map(Number);
const only = arg('places', 'train,gate,office').split(',');
const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=${arg('q', '0')}`;

await withBrowserJob('perf-day-calls', async (browser) => {
  const { page, errors } = await openGame(browser, { viewport: { width: W, height: H }, mode: 'fast', url });
  const rows = await page.evaluate(async (only) => {
    const g = window.__game, R = g.renderer, rows = [];
    const frame = () => new Promise((x) => requestAnimationFrame(x));
    async function measure() {
      const pl = g.place, S = pl.scene, P = pl.perf, kind = new Map();
      const mark = (root, k) => root && root.traverse && root.traverse((o) => kind.has(o) || kind.set(o, k));
      for (const x of Object.values(pl.people || {})) mark(x && x.root, 'person');
      mark(g.player?.root, 'person');
      mark(g.mioNpc?.root, 'person');
      for (const t of Object.values(pl.things || {})) {
        if (!t) continue;
        mark(t.obj, 'thing');
        try { if (t.outline) for (const o of [].concat(t.outline())) mark(o, 'thing'); } catch { /* */ }
      }
      const cat = (o) => {
        if (o.userData.perfBatch) return 'batch';
        if (kind.has(o)) return kind.get(o);
        const i = P && P.info.get(o);
        if (i) return i.state === 'wait' ? 'single' : i.state;
        return o.material && o.material.transparent ? 'transparent' : 'other';
      };
      const out = {}, names = {};
      let tris = 0;
      const orig = R.renderBufferDirect.bind(R);
      R.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
        const c = cat(object), k = scene === null ? 'shadow ' + c : scene === S ? c : 'fullscreen';
        out[k] = (out[k] || 0) + 1;
        if (c !== 'batch' && scene !== null && scene === S) {
          const path = [];
          for (let p = object, i = 0; i < 3 && p && p !== S; i++, p = p.parent) path.push(p.name || p.type);
          const nk = c + ' ' + path.reverse().join('/');
          names[nk] = (names[nk] || 0) + 1;
        }
        if (object.isMesh) tris += Math.round(Math.min(geometry.index ? geometry.index.count : geometry.attributes.position.count, geometry.drawRange.count) / 3);
        return orig(camera, scene, geometry, material, object, group);
      };
      await frame();
      R.renderBufferDirect = orig;
      return { place: pl.name, total: Object.values(out).reduce((a, b) => a + b, 0), tris, out, names };
    }
    while (!window.__test?.done && !window.__ended) {
      if (g.place && only.includes(g.place.name) && !document.body.classList.contains('trip')) rows.push(await measure());
      await new Promise((x) => setTimeout(x, 400));
    }
    return rows;
  }, only);
  for (const name of only) {
    const rs = rows.filter((r) => r.place === name).sort((a, b) => a.total - b.total);
    if (!rs.length) continue;
    const med = rs[rs.length >> 1], agg = {};
    for (const r of rs) for (const [k, v] of Object.entries(r.names)) agg[k] = (agg[k] || 0) + v / rs.length;
    console.log(`\n${name}: ${rs.length} frames, draw calls min ${rs[0].total}, median ${med.total}, max ${rs[rs.length - 1].total}; median frame ${Math.round(med.tris / 1000)}k tris`);
    console.log('  median frame: ' + Object.entries(med.out).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
    console.log('  main-pass draws outside a batch, average a frame:');
    for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, +(arg('top', 15)))) console.log(`    ${v.toFixed(1).padStart(5)}  ${k}`);
  }
  if (errors.length) console.log('page errors:\n' + errors.join('\n'));
});
