// The interaction pins and the hover outline: Eric on open floor (every pin), next to targets (the in-reach pin, full
// frame plus a close crop), and a person outlined under the mouse (Mio on the train) to check that only the model is
// outlined, never the shadow blob under it.
//   PLACE=train|office IDS=tama,aoi,free:-1.6:0 HOVER=mio
//   node game3d/tools/pins-outline-shots.mjs <outdir> <prefix> [W H]   (browser and GPU locks: tools/lib/browser-job.mjs)
// q=1 so the outline pass is on.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/pins-outline', pre = 'after', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('pins-outline', async (b) => {
  const phone = +W < 700;
  const p = await b.newPage({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
  });
  p.setDefaultTimeout(90000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false }));
    } catch {}
  });
  const PLACE = process.env.PLACE || 'train';
  const IDS = (process.env.IDS || (PLACE === 'train' ? 'free:-1.6:0,tama,aoi' : 'free:0:0')).split(',');
  const HOVER = (process.env.HOVER ?? (PLACE === 'train' ? 'mio' : '')).split(',').filter(Boolean);
  await p.goto(`${process.env.BASE || 'http://127.0.0.1:8771'}/game3d/index.html?q=1&place=${PLACE}`);
  if (PLACE === 'train') {
    await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    if (phone) await p.tap('#title .go');
    else await p.click('#title .go');
  }
  await p.waitForFunction(
    () => window.__game && window.__game.player && !document.body.classList.contains('at-title'),
    null,
    {
      timeout: 60000,
    },
  );
  await p.waitForTimeout(2500);
  for (let i = 0; i < 25 && PLACE !== 'train' && (await p.evaluate(() => !!window.__game.busy)); i++) {
    await p.keyboard.press('Space');
    await p.waitForTimeout(500);
  }
  await p.evaluate(() => {
    if (window.__onboard) window.__onboard.moved = true;
  });
  // the opening line on the train: move it on so the dialogue box doesn't cover the car
  for (let i = 0; i < 8; i++) {
    const up = await p.evaluate(() => {
      const t = document.getElementById('talk');
      return !!(t && !t.hidden && t.offsetParent !== null && t.innerText.trim());
    });
    if (!up) break;
    await p.keyboard.press('Space');
    await p.waitForTimeout(700);
  }
  console.log(
    'markers:',
    await p.evaluate(() =>
      window.__game.markers.list
        .filter((m) => m.enabled())
        .map((m) => m.id)
        .join(' '),
    ),
  );
  const screenOf = (id) =>
    p.evaluate((id) => {
      const G = window.__game;
      const m = G.markers.list.find((x) => x.id === id);
      const v = new G.player.root.position.constructor();
      if (m) m.anchor(v);
      else G.place.people[id].root.getWorldPosition(v).setY(1);
      v.project(G.place.camera);
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
    }, id);
  const crop = async (f, c) => {
    const cw = Math.min(+W, 560),
      ch = Math.min(+H, 380);
    const x = Math.max(0, Math.min(+W - cw, c[0] - cw / 2)),
      y = Math.max(0, Math.min(+H - ch, c[1] - ch / 2));
    await p.screenshot({ path: f, clip: { x, y, width: cw, height: ch } });
  };
  for (const id of IDS) {
    await p.evaluate((id) => {
      const G = window.__game;
      const s = id.startsWith('free')
        ? id.split(':').slice(1).map(Number)
        : G.markers.list.find((x) => x.id === id).spot();
      G.player.root.position.x = s[0];
      G.player.root.position.z = s[1];
    }, id);
    await p.waitForTimeout(1800);
    const tag = `${PLACE}-${id.split(':')[0]}`;
    await p.screenshot({ path: `${out}/${pre}-${tag}-${W}x${H}.png` });
    if (!id.startsWith('free')) await crop(`${out}/${pre}-${tag}-${W}x${H}-crop.png`, await screenOf(id));
  }
  // a person under the mouse: Mio stands in the aisle (on the train she is only in the car later in the day, so the
  // shot puts her there), and the outline must hug her body with no square from the blob shadow under her
  for (const id of HOVER) {
    const ok = await p.evaluate((id) => {
      const G = window.__game,
        P = G.place;
      const r = P.people[id];
      if (!r) return false;
      if (id === 'mio' && G.mioNpc) {
        G.mioNpc.root.visible = true;
        G.mioNpc.root.position.set(-0.6, 0, 0.3);
        G.mioNpc.setState && G.mioNpc.setState('idle');
        G.player.root.position.set(2.2, 0, 0.3);
      }
      return true;
    }, id);
    if (!ok) {
      console.log('no person', id);
      continue;
    }
    await p.waitForTimeout(1200);
    const pt = await screenOf(id);
    // hover straight from the page: the outline takes game.hover (a pointer event would need the model under it)
    await p.evaluate((id) => {
      const G = window.__game;
      G.hover = G.markers.list.find((x) => x.id === id) || { id, el: null };
    }, id);
    await p.waitForTimeout(900);
    await p.screenshot({
      path: `${out}/${pre}-${PLACE}-hover-${id}-${W}x${H}.png`,
    });
    await crop(`${out}/${pre}-${PLACE}-hover-${id}-${W}x${H}-crop.png`, [pt[0], pt[1] + 40]);
  }
  console.log(pre, PLACE, W, H, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
});
