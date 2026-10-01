// Where the draw calls go over the whole day: plays the fast test's day (?test=fast, q0) and every 400 ms counts one
// frame's draws by pass (main, shadow, the outline's depth and mask) and kind (batch, person, thing, single, dynamic, transparent, other), per place.
// Prints per place the median frame's split and the objects outside a batch that draw most often.
// Also a timeline per place (ms after entering it, calls, Eric's x,z, his target) and the split of the busiest frame.
//   node game3d/tools/perf/day-calls.mjs [w] [h] [--places train,gate,office] [--q 0] [--every 400] [--trips] [--top 15] [--who kuro]
// --trips also samples while a trip (walk out, crossfade, lift ride) is on screen, which is skipped otherwise.
// It stops once every place asked for has been played and left (the rest of the day is not waited for).
// BASE=<dir> for a worktree.
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { openGame } from '../../test/support/open-game.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [W = 390, H = 844] = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--')).map(Number);
const only = arg('places', 'train,gate,office').split(',');
const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=${arg('q', '0')}`;

await withBrowserJob('perf-day-calls', async (browser) => {
  const { page, errors } = await openGame(browser, { viewport: { width: W, height: H }, mode: 'fast', url });
  const rows = await page.evaluate(async ({ only, trips, every }) => {
    const g = window.__game, R = g.renderer, rows = [];
    const frame = () => new Promise((x) => requestAnimationFrame(x));
    async function measure() {
      const pl = g.place, S = pl.scene, P = pl.perf, kind = new Map();
      const who = new Map(); // mesh -> the person or thing it belongs to, for the names below
      const mark = (root, k, id) => root && root.traverse && root.traverse((o) => kind.has(o) || (kind.set(o, k), who.set(o, id)));
      for (const [id, x] of Object.entries(pl.people || {})) mark(x && x.root, 'person', id);
      mark(g.player?.root, 'person', 'eric');
      mark(g.mioNpc?.root, 'person', 'mio');
      for (const [id, t] of Object.entries(pl.things || {})) {
        if (!t) continue;
        mark(t.obj, 'thing', id);
        try { if (t.outline) for (const o of [].concat(t.outline())) mark(o, 'thing', id); } catch { /* */ }
      }
      const cat = (o) => {
        if (o.userData.perfBatch) return 'batch';
        if (kind.has(o)) return kind.get(o);
        const i = P && P.info.get(o);
        if (i) return i.state === 'wait' ? 'single' : i.state;
        return o.material && o.material.transparent ? 'transparent' : 'other';
      };
      const out = {}, names = {}, per = {}; // per: draws (main and shadow) of each person and thing
      let tris = 0;
      const orig = R.renderBufferDirect.bind(R);
      R.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
        const c = cat(object), k = scene === null ? 'shadow ' + c : scene === S ? (S.overrideMaterial ? (S.overrideMaterial.isShaderMaterial ? 'outline mask ' : S.overrideMaterial.isMeshDepthMaterial ? 'outline depth ' : 'override ') : '') + c : 'fullscreen';
        out[k] = (out[k] || 0) + 1;
        if (who.has(object) && (scene === null || scene === S)) per[who.get(object)] = (per[who.get(object)] || 0) + 1;
        if (c !== 'batch' && scene !== null && scene === S && !S.overrideMaterial) {
          // the object's own name or type, under its nearest named ancestor (what a builder called it)
          let named = object.parent;
          while (named && named !== S && !named.name) named = named.parent;
          const path = [object.name || object.type];
          if (named && named !== S) path.unshift(named.name + (named === object.parent ? '' : '/…'));
          const nk = c + ' ' + (who.has(object) ? who.get(object) + ':' : '') + path.join('/');
          names[nk] = (names[nk] || 0) + 1;
        }
        if (object.isMesh) tris += Math.round(Math.min(geometry.index ? geometry.index.count : geometry.attributes.position.count, geometry.drawRange.count) / 3);
        return orig(camera, scene, geometry, material, object, group);
      };
      await frame();
      R.renderBufferDirect = orig;
      const e = g.player?.root.position;
      return { place: pl.name, near: g.near?.id, at: Math.round(performance.now() - (entered || 0)), pos: e ? [+e.x.toFixed(1), +e.z.toFixed(1)] : null, per, total: Object.values(out).reduce((a, b) => a + b, 0), tris, out, names };
    }
    let entered = 0, last = null;
    const left = new Set(only); // stop once every place asked for has been played and left
    while (!window.__test?.done && !window.__ended) {
      if (g.place !== last) (last = g.place), (entered = performance.now());
      if (g.place && only.includes(g.place.name)) left.delete(g.place.name);
      else if (g.place && !left.size) break;
      const trip = document.body.classList.contains('trip');
      if (g.place && only.includes(g.place.name) && (trips || !trip)) rows.push({ ...(await measure()), trip });
      await new Promise((x) => setTimeout(x, every));
    }
    return rows;
  }, { only, trips: argv.includes('--trips'), every: +arg('every', 400) });
  const whoArg = arg('who', ''); // --who <person or thing id>: its draws in each timeline sample
  for (const name of only) {
    const rs = rows.filter((r) => r.place === name).sort((a, b) => a.total - b.total);
    if (!rs.length) continue;
    const med = rs[rs.length >> 1], agg = {};
    for (const r of rs) for (const [k, v] of Object.entries(r.names)) agg[k] = (agg[k] || 0) + v / rs.length;
    console.log(`\n${name}: ${rs.length} frames, draw calls min ${rs[0].total}, median ${med.total}, max ${rs[rs.length - 1].total}; median frame ${Math.round(med.tris / 1000)}k tris`);
    console.log('  median frame: ' + Object.entries(med.out).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
    const top = rs[rs.length - 1];
    console.log(`  timeline (ms after entry, calls, Eric x,z, target): ` + rows.filter((r) => r.place === name).map((r) => `${r.at} ${r.total}${r.pos ? ` (${r.pos})` : ''}${r.near ? ' ' + r.near + ' (outline ' + Object.entries(r.out).filter(([k]) => k.startsWith('outline')).reduce((n, [, v]) => n + v, 0) + ')' : ''}${r.trip ? ' trip' : ''}${whoArg ? ` ${whoArg} ${r.per[whoArg] || 0}` : ''}`).join(' | '));
    console.log(`  max frame at ${top.at} ms${top.trip ? ' (in a trip)' : ''}, Eric at ${top.pos}${top.near ? ', target ' + top.near : ''}: ` + Object.entries(top.out).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
    console.log('    its main-pass draws outside a batch: ' + Object.entries(top.names).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(', '));
    console.log('  main-pass draws outside a batch, average a frame:');
    for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, +(arg('top', 15)))) console.log(`    ${v.toFixed(1).padStart(5)}  ${k}`);
  }
  if (errors.length) console.log('page errors:\n' + errors.join('\n'));
});
