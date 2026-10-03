// Close-ups of the chibi look (?chibi=1, js/chibi.js): Eric, Mio and Kuro in the places they appear, at one size.
//   node game3d/tools/chibi-shots.mjs [w] [h] [off]      off: the same shots with the approved models, to compare
// Each shot opens a place in capture mode (?cap), stands Mio beside Eric where the story hasn't put her, stops the
// place's camera and frames the people from the front at head height; the train also has the game's own view and
// both seated. BASE=.claude/worktrees/<name>/game3d shoots a worktree. Output: game3d/shots/chibi/<w>x<h>[-off]/.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860', OFF = ''] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/chibi', `${W}x${H}${OFF ? '-off' : ''}`);
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?cap&q=${process.env.QUALITY ?? (phone ? 1 : 2)}${OFF ? '&chibi=0' : '&chibi=1'}`;
// name, query, who to frame ('eric', 'mio', 'kuro', 'pair'), view: 'game' (the place's camera) or a close-up,
// pose: 'walk' sets the framed people walking (side view), 'phone' has them look at their phones
const SHOTS = [
  ['train-view', 'place=train&st=sit', 'pair', 'game'],
  ['train-seated', 'place=train&st=sit', 'pair', 'close'],
  ['train-standing', 'place=train', 'eric', 'close'],
  ['gate', 'place=gate', 'pair', 'close'],
  ['gate-view', 'place=gate', 'pair', 'game'],
  ['lobby-kuro', 'place=forecourt', 'kuro', 'close'],
  ['office', 'place=office', 'pair', 'close'],
  ['office-view', 'place=office', 'pair', 'game'],
  ['plaza', 'place=plaza', 'pair', 'close'],
  ['plaza-walk', 'place=plaza', 'pair', 'side', 'walk'],
  ['plaza-phone', 'place=plaza', 'pair', 'close', 'phone'],
];
await withBrowserJob('chibi-shots', async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null; // ONLY=gate,office shoots just those
  // a phone's tall frame can't take two people side by side up close: one close-up each
  const list = phone
    ? SHOTS.flatMap((s) => (s[2] === 'pair' && s[3] !== 'game' ? ['eric', 'mio'].map((w) => [`${s[0]}-${w}`, s[1], 'pair:' + w, ...s.slice(3)]) : [s]))
    : SHOTS;
  for (const [name, q, who, view, pose] of list.filter((s) => !only || only.includes(s[0]))) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errs.push(m.text()));
    await p.goto(`${base}&${q}`);
    await p.waitForFunction(() => window.__done, null, { timeout: 90000 }).catch(() => errs.push('timeout'));
    const info = await p.evaluate(
      async ({ who: shot, view, pose, norecv }) => {
        const [who, focus] = shot.split(':');
        const g = window.__game;
        const THREE = await import('three');
        const eric = g.player,
          mio = g.mioNpc;
        let kuro = g.place.people?.kuro;
        // Mio beside Eric unless the place already shows her
        if (who === 'pair' && !mio.root.visible) {
          eric.root.parent.add(mio.root);
          mio.root.visible = true;
          mio.root.scale.copy(eric.root.scale);
          const e = eric.root.position;
          const k = eric.root.scale.x;
          if (view === 'side') mio.root.position.set(e.x, e.y, e.z + 0.7 * k);
          else mio.root.position.set(e.x + 0.55 * k, e.y, e.z);
          mio.root.rotation.y = 0;
          eric.root.rotation.y = 0;
          mio.setState('idle');
        }
        if (pose === 'walk')
          for (const r of [eric, mio]) {
            r.setGait?.(null); // the clip at its own pace, not the walker's (standing: 0)
            r.setState('walk');
            r.update(r === eric ? 0.55 : 0.3);
            r.setState = () => {}; // held: the place would stand them still again
          }
        if (pose === 'phone')
          for (const r of [eric, mio]) {
            r.phone?.('look'); // its promise waits on frames the place may not give her; step the layer here
            for (let i = 0; i < 40; i++) r.update(1 / 30);
          }
        if (norecv) for (const r of [eric, mio, kuro]) r?.model?.traverse((o) => o.isMesh && ((o.receiveShadow = false), (o.material.needsUpdate = true)));
        if (who === 'kuro') {
          // Eric in the lobby, beside her counter, so the building's inside shows
          const kq = kuro.root.getWorldQuaternion(new THREE.Quaternion());
          const kp = kuro.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(1.4, 0, 0.9).applyQuaternion(kq));
          eric.root.position.set(kp.x, eric.root.position.y, kp.z);
          for (let i = 0; i < 30; i++) g.step(1 / 30);
        }
        const people = who === 'kuro' ? [kuro] : who === 'eric' || focus === 'eric' ? [eric] : focus === 'mio' ? [mio] : [eric, mio];
        const box = new THREE.Box3();
        for (const r of people) box.expandByObject(r.root);
        const c = box.getCenter(new THREE.Vector3()),
          s = box.getSize(new THREE.Vector3());
        const cam = g.place.camera;
        if (view !== 'game') {
          if (g.place.cam) g.place.cam.update = () => {};
          document.getElementById('marks').style.display = 'none';
          const f = (Math.max(s.y, s.x / cam.aspect) * 1.25) / (2 * Math.tan((cam.fov * Math.PI) / 360));
          const dir = view === 'side' ? new THREE.Vector3(1, 0.12, 0.05) : new THREE.Vector3(0.08, cam.aspect < 1 ? 0.5 : 0.3, 1);
          let yaw = 0;
          if (who === 'kuro') yaw = kuro.root.getWorldQuaternion(new THREE.Quaternion());
          if (yaw) dir.applyQuaternion(yaw);
          cam.position.copy(c).addScaledVector(dir.normalize(), f);
          cam.lookAt(c);
          cam.updateMatrixWorld();
        }
        await new Promise((ok) => setTimeout(ok, 700));
        const h = (r) => {
          const b = new THREE.Box3().setFromObject(r.root);
          return +(b.max.y - b.min.y).toFixed(3);
        };
        return { heights: people.map(h), chibi: people.map((r) => !!r.chibi) };
      },
      { who, view, pose, norecv: !!process.env.NORECV },
    );
    await p.screenshot({ path: path.join(out, name + '.png') });
    console.log(name, JSON.stringify(info), errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
    await p.close();
  }
});
console.log('artifacts:', out);
