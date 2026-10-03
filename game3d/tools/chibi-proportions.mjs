// Before/after pictures of the chibi builds (js/chibi-builds.js, Review chibi-proportions-1), in the game with ?chibi=1.
//   node game3d/tools/chibi-proportions.mjs [w] [h]
// For each of 'before' (?chibibuild=0: Meshy's proportions with the 0.85 head) and 'after': the ten in a row on the
// plaza, and per person in WHO (default kuro,rei) front, her left 3/4, her left side, mid-stride, her head straight on
// and from her left (face, face34), and Kuro in the game's own view at her counter. BASE=.claude/worktrees/<name>/game3d shoots a worktree; ONLY=lineup,kuro-walk;
// WHEN=after shoots one side; TAG=rei2plain names the files in place of before/after.
// Output: game3d/shots/chibi-proportions/<w>x<h>/<before|after>-<shot>.png
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/chibi-proportions', `${W}x${H}`);
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const root = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?cap&chibi=1&q=${phone ? 1 : 2}`;
const CAST = ['eric', 'mio', 'kuro', 'mori', 'kenji', 'emi', 'guard', 'kuroda', 'aoi', 'rei'];
const WHO = (process.env.WHO || 'kuro,rei').split(',');
// name, place, who, camera direction (x, y, z from the people), pose
const SHOTS = [['lineup', 'plaza', 'cast', [0.04, 0.22, 1]]];
for (const id of WHO) {
  SHOTS.push([`${id}-front`, 'plaza', id, [0, 0.18, 1]]);
  SHOTS.push([`${id}-34`, 'plaza', id, [0.75, 0.2, 0.75]]);
  SHOTS.push([`${id}-side`, 'plaza', id, [1, 0.12, 0.02]]);
  SHOTS.push([`${id}-walk`, 'plaza', id, [1, 0.12, 0.02], 'walk']);
  // the head alone, straight on and from her left (Review chibi-proportions-1, "Rei face" and "Kuro face")
  SHOTS.push([`${id}-face`, 'plaza', id, [0, 0.08, 1], 'face']);
  SHOTS.push([`${id}-face34`, 'plaza', id, [0.7, 0.08, 0.7], 'face']);
}
SHOTS.push(['kuro-counter', 'forecourt', 'counter', null]);
const only = process.env.ONLY?.split(',');

await withBrowserJob('chibi-proportions', async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  for (const when of (process.env.WHEN || 'before,after').split(',')) {
    for (const [name, place, who, dir, pose] of SHOTS.filter((s) => !only || only.includes(s[0]))) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`${root}${when === 'before' ? '&chibibuild=0' : ''}&place=${place}`);
      await p.waitForFunction(() => window.__done, null, { timeout: 90000 }).catch(() => errs.push('timeout'));
      const info = await p.evaluate(
        async ({ who, dir, pose, CAST }) => {
          const g = window.__game;
          const THREE = await import('three');
          const v = document.querySelector('script[src*="main.js"]').src.split('main.js')[1];
          const m = await import('./js/chibi.js' + v);
          const eric = g.player,
            mio = g.mioNpc;
          const k = eric.root.scale.x;
          const e0 = eric.root.position.clone();
          let row = [];
          const add = async (id) => {
            const r = id === 'eric' ? eric : await m.loadChibi(id);
            if (r !== eric) eric.root.parent.add(r.root);
            r.root.scale.setScalar(id === 'mio' || id === 'eric' ? k : 1.18); // as chibi-shots.mjs: the scenes' K
            r.root.position.copy(e0);
            r.root.rotation.y = 0;
            r.setState('idle');
            r.update(0.3);
            return r;
          };
          if (who === 'counter') {
            // Eric beside her counter, so the game's own camera shows her there (as chibi-shots.mjs 'lobby-kuro')
            const kuro = g.place.people?.kuro;
            if (!kuro) return { heights: 'no kuro' };
            const kq = kuro.root.getWorldQuaternion(new THREE.Quaternion());
            const kp = kuro.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(1.4, 0, 0.9).applyQuaternion(kq));
            eric.root.position.set(kp.x, eric.root.position.y, kp.z);
            document.getElementById('marks').style.display = 'none';
            for (let i = 0; i < 60; i++) g.step?.(1 / 30);
            await new Promise((ok) => setTimeout(ok, 700));
            return { heights: [kuro.chibi] };
          }
          if (mio?.root) mio.root.visible = false;
          if (who === 'cast') {
            for (const id of CAST) row.push(await add(id));
            row.forEach((r, i) => (r.root.position.x = e0.x + 0.5 * k * (i - (row.length - 1) / 2)));
          } else {
            eric.root.visible = false;
            row = [await add(who)];
          }
          if (pose === 'walk') {
            const r = row[0];
            r.setGait?.(null);
            r.setState('walk');
            r.update(0.3); // the first step after the switch still holds the idle's pose
            r.update(0.25);
            r.setState = () => {};
          }
          for (let i = 0; i < 3; i++) g.step?.(1 / 30);
          if (pose === 'walk') row[0].update(0);
          const box = new THREE.Box3();
          for (const r of row) box.expandByObject(r.root);
          if (pose === 'face') box.min.y = box.max.y - 0.5 * (box.max.y - box.min.y);
          const c = box.getCenter(new THREE.Vector3()),
            s = box.getSize(new THREE.Vector3());
          const cam = g.place.camera;
          if (g.place.cam) g.place.cam.update = () => {};
          document.getElementById('marks').style.display = 'none';
          const f = (Math.max(s.y, s.x / cam.aspect) * 1.25) / (2 * Math.tan((cam.fov * Math.PI) / 360));
          cam.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), f);
          cam.lookAt(c);
          // anything between the camera and the people (a wall, a roof edge on the phone's far view) is clipped away
          cam.near = Math.max(cam.near, f - 1.5 * Math.max(s.z, 0.6));
          cam.updateProjectionMatrix();
          cam.updateMatrixWorld();
          await new Promise((ok) => setTimeout(ok, 700));
          const h = (r) => {
            const b = new THREE.Box3().setFromObject(r.root);
            return +(b.max.y - b.min.y).toFixed(3);
          };
          return { heights: row.map(h), feet: row.map((r) => +new THREE.Box3().setFromObject(r.root).min.y.toFixed(3)) };
        },
        { who, dir, pose, CAST },
      );
      await p.screenshot({ path: path.join(out, `${process.env.TAG || when}-${name}.png`) });
      console.log(when, name, JSON.stringify(info), errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
      await p.close();
    }
  }
});
console.log('artifacts:', out);
