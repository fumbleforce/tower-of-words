import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const base = 'http://127.0.0.1:8771/',
  out = '/home/jorgen/repo/japanese/art/parts/pool-swimwear-1/shape-comparison';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'pool-swimwear-shape-compare',
  async (browser) => {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
    await page.route('**/swim-shape-check', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<style>body{margin:0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/game3d/vendor/three/three.module.js"}}</script><canvas id="c"></canvas>',
      }),
    );
    await page.addInitScript(() => localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })));
    await page.goto(base + 'swim-shape-check');
    await page.evaluate(async () => {
      const T = await import('three'),
        { GLTFLoader } = await import('/game3d/vendor/loaders/GLTFLoader.js');
      const renderer = new T.WebGLRenderer({
        canvas: document.querySelector('#c'),
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(1400, 1000);
      renderer.outputColorSpace = T.SRGBColorSpace;
      const scene = new T.Scene();
      scene.background = new T.Color(0xeceef1);
      scene.add(new T.HemisphereLight(0xffffff, 0x8a8f94, 2));
      const light = new T.DirectionalLight(0xffffff, 1.5);
      light.position.set(-3, 6, 4);
      scene.add(light);
      const cam = new T.OrthographicCamera(-1, 1, 1.214, -0.214, 0.01, 20);
      cam.position.set(0, 0, 5);
      cam.lookAt(0, 0, 0);
      const loader = new GLTFLoader();
      let models = [];
      async function model(url, tex, x) {
        const g = (await loader.loadAsync(url)).scene;
        if (tex) {
          const map = await new T.TextureLoader().loadAsync(tex);
          map.flipY = false;
          map.colorSpace = T.SRGBColorSpace;
          g.traverse((o) => {
            if (o.isMesh) o.material = new T.MeshStandardMaterial({ map, roughness: 0.9 });
          });
        }
        const b = new T.Box3().setFromObject(g),
          scale = 1 / (b.max.y - b.min.y);
        g.scale.multiplyScalar(scale);
        b.setFromObject(g);
        g.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
        const wrap = new T.Group();
        wrap.add(g);
        wrap.position.x = x;
        scene.add(wrap);
        return wrap;
      }
      window.__shape = {
        async show(who) {
          models.forEach((m) => scene.remove(m));
          const stem = '/art/parts/pool-swimwear-1/meshy/' + (who === 'kuro' ? 'kuro-b' : who) + '/';
          const current = '/game3d/assets/' + (who === 'eric' ? 'eric' : 'characters/' + who) + '/';
          models = await Promise.all([
            model(stem + (['kuro', 'emi'].includes(who) ? 'rigged.glb' : 'shape.glb'), null, -0.45),
            model(current + 'walk.glb', current + 'base.webp', 0.45),
          ]);
        },
        render(yaw) {
          models.forEach((m) => (m.rotation.y = yaw));
          renderer.render(scene, cam);
        },
      };
    });
    for (const who of ['carina', 'eric', 'kuro', 'emi']) {
      await page.evaluate((who) => window.__shape.show(who), who);
      for (const [name, yaw] of [
        ['front', 0],
        ['side', 1.57],
      ]) {
        await page.evaluate((y) => window.__shape.render(y), yaw);
        await page.locator('#c').screenshot({ path: out + '/' + who + '-' + name + '.png' });
      }
    }
    if (errors.length) throw Error(errors.join('\n'));
    console.log('PASS eight equal-height current-model comparisons');
  },
  { timeoutMs: 90000 },
);
