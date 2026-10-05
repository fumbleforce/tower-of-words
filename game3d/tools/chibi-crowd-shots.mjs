// Close-ups of the generic chibis (js/chibi-crowd.js, Review chibi-crowd-1), with ?chibi=1:
//   variants-<base>   one base in five of its colour variants, front and from behind, on the plaza (no crowd)
//   faces-<base>      the middle one's head close up (the cheeks and eyes of each mesh tier)
//   skirt-<base>      the same five from behind, hips to knees (the colour mask's edges)
//   top-<base>        the same five's heads from above and behind (the crown, where the hair is thinnest)
//   train-*           the train's passengers (chibi-passengers.js): the game's view, and each close up
//   gate-*            the gate's office workers and commuters (cast.js PEOPLE.worker)
//   node game3d/tools/chibi-crowd-shots.mjs [w] [h]     ONLY=variants,train  BASE=.claude/worktrees/<name>/game3d
//   QS=&chibitier=lo adds to the query; TAG=lo names the output folder <w>x<h>-<tag>; CROWD=1: the variants cast no
//   sun shadow, as in the ambient crowd
// Output: game3d/shots/chibi-crowd/<w>x<h>/. The crowd in play is shot by crowd-check.mjs (QS=&chibi=1).
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/chibi-crowd', `${W}x${H}${process.env.TAG ? '-' + process.env.TAG : ''}`);
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?cap&chibi=1&q=${phone ? 1 : 2}${process.env.QS || ''}`;
const BASES = ['suit', 'shirt', 'blouse', 'cardigan', 'polo', 'hoodie', 'apron', 'dock'];
// name, query, what: 'variants:<base>' | 'people:<id>,...' | 'view'; side: 'front' | 'back' | 'game'
const SHOTS = [
  ...BASES.flatMap((b) => [
    [`variants-${b}`, 'place=plaza&nocrowd', 'variants:' + b, 'front'],
    [`variants-${b}-back`, 'place=plaza&nocrowd', 'variants:' + b, 'back'],
    [`faces-${b}`, 'place=plaza&nocrowd', 'variants:' + b, 'face'],
    [`skirt-${b}`, 'place=plaza&nocrowd', 'variants:' + b, 'skirt'],
    [`top-${b}`, 'place=plaza&nocrowd', 'variants:' + b, 'top'],
  ]),
  ['train-view', 'place=train', 'view', 'game'],
  ['train-passengers', 'place=train', 'people:reader,music,bun', 'front'],
  ['train-music', 'place=train', 'people:music', 'front'],
  ['train-reader', 'place=train', 'people:reader', 'front'],
  ['train-bun', 'place=train', 'people:bun', 'back'],
  ['gate-view', 'place=gate', 'view', 'game'],
  ['shotengai-view', 'place=shotengai', 'view', 'game'],
  ['plaza-view', 'place=plaza', 'view', 'game'],
  ['gate-workers', 'place=gate', 'extras', 'front'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
await withBrowserJob('chibi-crowd-shots', async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: phone ? 2 : 1 });
  for (const [name, q, what, side] of SHOTS.filter((s) => !only || only.some((o) => s[0].startsWith(o)))) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()));
    await p.goto(`${base}&${q}`);
    await p.waitForFunction(() => window.__done, null, { timeout: 90000 }).catch(() => errs.push('timeout'));
    const info = await p.evaluate(
      async ({ what, side, phone, crowd }) => {
        const g = window.__game,
          P = g.place;
        const THREE = await import('three');
        const v = document.querySelector('script[src*="main.js"]').src.split('main.js')[1];
        const C = await import('./js/chibi-crowd.js' + v);
        const eric = g.player;
        let row = [];
        const [kind, arg] = what.split(':');
        if (kind === 'variants') {
          // five variants of one base in a row where Eric stands (he steps out of the way)
          const e0 = eric.root.position.clone(),
            k = eric.root.scale.x;
          eric.root.visible = false;
          for (let i = 0; i < 5; i++) {
            const r = C.generic(arg, i);
            eric.root.parent.add(r.root);
            r.root.scale.setScalar(k);
            r.root.position.set(e0.x + 0.55 * k * (i - 2), e0.y, e0.z);
            r.root.rotation.y = side === 'back' || side === 'skirt' ? Math.PI : 0;
            r.setState('idle');
            // as in the ambient crowd, no sun shadow (crowd/index.js): CROWD=1
            if (crowd) r.root.traverse((o) => o.isMesh && (o.castShadow = false));
            r.update(0.4 + i * 0.3);
            row.push(r);
          }
        }
        if (kind === 'people') row = arg.split(',').map((id) => P.people?.[id]).filter(Boolean);
        if (kind === 'extras') {
          row = Object.values(P.extras || {}).filter((r) => r?.root);
          for (const r of row) r.root.visible = true;
        }
        for (let i = 0; i < 20; i++) g.step?.(1 / 30);
        if (side !== 'game' && row.length) {
          if (P.cam) P.cam.update = () => {};
          document.getElementById('marks').style.display = 'none';
          const box = new THREE.Box3();
          // one person on a phone's narrow screen, or the row is too far off to see
          const one = side === 'face' || (phone && kind === 'variants');
          for (const r of one ? row.slice(2, 3) : row) box.expandByObject(r.root);
          // a band of the figures' height: the heads, or hips to knees
          const H = box.max.y - box.min.y;
          if (side === 'face' || side === 'top') box.min.y = box.max.y - 0.42 * H;
          if (side === 'skirt') [box.min.y, box.max.y] = [box.min.y + 0.1 * H, box.min.y + 0.45 * H];
          const c = box.getCenter(new THREE.Vector3()),
            s = box.getSize(new THREE.Vector3());
          const cam = P.camera;
          const f = (Math.max(s.y, Math.max(s.x, s.z) / cam.aspect) * 1.3) / (2 * Math.tan((cam.fov * Math.PI) / 360));
          // facing the people: the mean of their facings (front), or from behind them
          const q = row[0].root.getWorldQuaternion(new THREE.Quaternion());
          const dir = new THREE.Vector3(0.1, 0.35, side === 'back' ? -1 : 1).applyQuaternion(q);
          if (kind === 'variants') dir.set(0.06, side === 'face' || side === 'skirt' ? 0.08 : 0.3, 1);
          if (side === 'top') dir.set(0.15, 1.6, -0.6);
          cam.position.copy(c).addScaledVector(dir.normalize(), f);
          cam.lookAt(c);
          cam.updateMatrixWorld();
        }
        await new Promise((ok) => setTimeout(ok, 800));
        return {
          n: row.length,
          chibi: row.map((r) => !!r.chibi),
          base: row.map((r) => r.base || null),
          tint: row.map((r) => {
            let t = null;
            r.root.traverse((o) => o.isSkinnedMesh && (t = o.material.userData.tint));
            return t ? ['tHair', 'tTop', 'tBot'].map((n) => +t[n].value.w.toFixed(3)) : null;
          }),
        };
      },
      { what, side, phone, crowd: !!process.env.CROWD },
    );
    await p.screenshot({ path: path.join(out, name + '.png') });
    console.log(name, JSON.stringify(info), errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
    await p.close();
  }
});
console.log('artifacts:', out);
