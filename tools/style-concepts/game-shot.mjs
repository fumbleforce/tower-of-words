// Put one concept's Mio and Eric into the running game (its own camera, light and place) and screenshot it, so the
// review shows them at the game's camera height and scale. The game's own Eric is hidden; Eric stands where he
// would, Mio a metre to his side, both facing the camera; Eric is caught mid-stride, Mio in her idle.
//   node tools/style-concepts/game-shot.mjs <style> <attempt> [place ...]   (default places: forecourt office)
// Needs the review server on :8771 (GUIDE, Local review server). Writes <attempt>/renders/game-<place>-<size>.png
// next to the concept's glb files (the main checkout's art/parts/style-concepts/, git-ignored).
import { withBrowserJob } from '../lib/browser-job.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [style, attempt, ...places] = process.argv.slice(2);
const main = path.dirname(execSync('git rev-parse --path-format=absolute --git-common-dir', { encoding: 'utf8' }).trim());
const dir = path.join(main, 'art/parts/style-concepts', `claude-${style}`, attempt);
const url = `/art/parts/style-concepts/claude-${style}/${attempt}/`;
fs.mkdirSync(path.join(dir, 'renders'), { recursive: true });
const sizes = [
  [1366, 860, 'desk'],
  [390, 844, 'phone'],
];
const errors = [];
await withBrowserJob(
  'style-concepts',
  async (browser) => {
    for (const [w, h, tag] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
      for (const place of places.length ? places : ['forecourt', 'office']) {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${place}: ${e.message}`));
        await page.goto(`http://127.0.0.1:8771/game3d/index.html?cap&q=1&place=${place}`, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
        const info = await page.evaluate(async (base) => {
          const THREE = await import('three');
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          const g = globalThis.__game;
          const scene = g.place.scene;
          const cam = g.place.camera;
          const me = g.player.root;
          const size = new THREE.Box3().setFromObject(me).getSize(new THREE.Vector3());
          me.visible = false;
          if (g.mioNpc) g.mioNpc.root.visible = false;
          const loader = new GLTFLoader();
          const load = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));
          const [mio, eric] = await Promise.all([load(base + 'mio.glb'), load(base + 'eric.glb')]);
          const at = me.position.clone();
          const toCam = new THREE.Vector3().subVectors(cam.position, at).setY(0).normalize();
          const side = new THREE.Vector3(-toCam.z, 0, toCam.x); // to the camera's left
          const yaw = Math.atan2(toCam.x, toCam.z);
          // scale both so Eric stands as tall as the game's Eric (Mio keeps her height relative to him)
          const ours = new THREE.Box3().setFromObject(eric.scene).getSize(new THREE.Vector3()).y;
          const k = size.y / ours;
          const mixers = [];
          for (const [gl, pos, clip, t] of [
            [eric, at, 'walk', 0.25],
            [mio, at.clone().addScaledVector(side, 0.9), 'idle', 0.5],
          ]) {
            const o = gl.scene;
            o.position.copy(pos);
            o.scale.setScalar(k);
            o.rotation.y = yaw;
            o.traverse((m) => {
              if (m.isMesh) m.castShadow = m.receiveShadow = true;
            });
            scene.add(o);
            const mixer = new THREE.AnimationMixer(o);
            const c = gl.animations.find((a) => a.name === clip) || gl.animations[0];
            if (c) {
              mixer.clipAction(c).play();
              mixer.update(t);
            }
            mixers.push(mixer);
          }
          await new Promise((r) => setTimeout(r, 600));
          const mid = at.clone().addScaledVector(side, 0.45).setY(0.7).project(cam);
          const sx = ((mid.x + 1) / 2) * globalThis.innerWidth,
            sy = ((1 - mid.y) / 2) * globalThis.innerHeight;
          return { gameEricHeight: size.y, scale: k, sx, sy, clips: eric.animations.map((a) => a.name) };
        }, url);
        const file = path.join(dir, 'renders', `game-${place}-${tag}.png`);
        await page.screenshot({ path: file });
        // and a close crop round the two of them, same pixels
        const cw = Math.min(w, 420),
          ch = Math.min(h, 300);
        const clip = {
          x: Math.max(0, Math.min(w - cw, info.sx - cw / 2)),
          y: Math.max(0, Math.min(h - ch, info.sy - ch / 2)),
          width: cw,
          height: ch,
        };
        await page.screenshot({ path: file.replace('.png', '-crop.png'), clip });
        console.log('wrote', file, JSON.stringify(info));
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
