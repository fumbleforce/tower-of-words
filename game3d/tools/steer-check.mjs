// Hold to steer (js/movement/steer.js; docs/game/controls-and-ui.md, Controls, Steering). Real input, real time:
//   plaza   a held press steers Eric round the fountain, the pointer kept a couple of steps ahead of him the way a
//           player leads him; letting go stops him where he is; then a quick click still walks to a point
//   office  a held press steers him across the office to two far things (round desks, through the doorway)
//   train   a click on Mio, and a held press on her, both target her and never steer
// Desktop sizes drive the mouse; a phone size (W < 700) drives a held finger through CDP touch events. The gait
// check (js/movement/gait-watch.js) runs throughout and fails on foot sliding or stepping on the spot.
//   node game3d/tools/steer-check.mjs [W H]      BASE=<path under the server root>/game3d
// Exits 1 on any failure or page error. Shots in game3d/shots/steer/<W>x<H>/.
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 1366), +(process.argv[3] || 860)];
const phone = W < 700;
const base = process.env.BASE || 'game3d';
const out = `game3d/shots/steer/${W}x${H}`;
fs.mkdirSync(out, { recursive: true });
const fails = [];
const bad = (m) => (fails.push(m), console.log('BAD', m));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// in the page: the screen point of a floor spot, Eric's state, and the point a player would hold the pointer on
const HELPERS = () => {
  const G = globalThis.__game;
  globalThis.__scr = (x, z) => {
    const P = G.place,
      v = G.player.root.position.clone().set(x, P.floorY || 0, z);
    P.space.localToWorld(v);
    v.project(P.camera);
    const r = globalThis.document.getElementById('c').getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  };
  globalThis.__eric = () => {
    const p = G.player.root.position,
      w = G.walker;
    return {
      x: p.x,
      z: p.z,
      k: G.place.charScale || 1,
      moving: w.moving,
      steer: !!w.steer,
      path: !!w.path,
      free: G.place.nav.free(p.x, p.z, G.place.nav.R * 0.6),
    };
  };
  // a press at screen (sx, sy) would land on a person, a thing or a pin (main.js picks), not the floor
  globalThis.__onTarget = (sx, sy) => {
    const P = G.place,
      v = G.player.root.position.clone();
    for (const m of G.markers.list) {
      if (!m.enabled()) continue;
      for (const a of [m.anchor(v.clone()), m.body ? m.body(v.clone()) : null]) {
        if (!a) continue;
        a.project(P.camera);
        if (
          Math.hypot(((a.x + 1) / 2) * globalThis.innerWidth - sx, ((1 - a.y) / 2) * globalThis.innerHeight - sy) < 60
        )
          return true;
      }
    }
    const T = globalThis.__THREE,
      ray = new T.Raycaster();
    ray.setFromCamera(
      new T.Vector2((sx / globalThis.innerWidth) * 2 - 1, -(sy / globalThis.innerHeight) * 2 + 1),
      P.camera,
    );
    ray.layers.enable(31);
    for (const m of G.markers.list)
      if (m.enabled() && G.objsOf(m).some((o) => ray.intersectObject(o, true).length)) return true;
    return !!globalThis.__pickPerson?.(G, sx, sy, globalThis.document.getElementById('c'));
  };
  // dist m ahead of Eric along the nav's route to g, on screen; and how far he is from g (m)
  globalThis.__lead = (g, dist = 1.6) => {
    const P = G.place,
      K = P.charScale || 1,
      e = G.player.root.position,
      path = P.nav.path(e.x, e.z, g[0], g[1]) || [g];
    let left = dist * K,
      at = [e.x, e.z];
    for (const q of path) {
      const d = Math.hypot(q[0] - at[0], q[1] - at[1]);
      if (d >= left) {
        at = [at[0] + ((q[0] - at[0]) * left) / d, at[1] + ((q[1] - at[1]) * left) / d];
        break;
      }
      left -= d;
      at = q;
    }
    return { s: globalThis.__scr(at[0], at[1]), d: Math.hypot(e.x - g[0], e.z - g[1]) / K };
  };
  // the nav route length from a to b in m, or 0 when it doesn't get there
  globalThis.__len = (a, b) => {
    const P = G.place,
      K = P.charScale || 1,
      p = P.nav.path(a[0], a[1], b[0], b[1]);
    if (!p?.length) return 0;
    let L = 0,
      q = a;
    for (const r of p) {
      L += Math.hypot(r[0] - q[0], r[1] - q[1]);
      q = r;
    }
    return Math.hypot(q[0] - b[0], q[1] - b[1]) < 0.3 * K ? L / K : 0;
  };
};

await withBrowserJob('steer-check', async (browser) => {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    isMobile: phone,
    hasTouch: phone,
  });
  await ctx.addInitScript(() =>
    globalThis.localStorage.setItem(
      'amakawa-onboard',
      JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }),
    ),
  );
  async function open(place) {
    const page = await ctx.newPage();
    await page.bringToFront();
    page.on('pageerror', (e) => bad(`${place}: page error ${e.message}`));
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&skip&place=${place}`, { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__game?.player && globalThis.__game.saveEnabled, null, {
      timeout: 120000,
    });
    await sleep(2500);
    for (let i = 0; i < 40 && (await page.evaluate(() => !!globalThis.__game.busy)); i++) {
      await page.keyboard.press('Space');
      await sleep(400);
    }
    if (await page.evaluate(() => !!globalThis.__game.busy)) bad(`${place}: the opening scene didn't end`);
    await page.evaluate(HELPERS);
    await page.evaluate(async () => {
      const { pickPerson } = await import(new URL('js/move.js', globalThis.location.href).href);
      globalThis.__pickPerson = pickPerson;
      globalThis.__THREE = await import('three');
    });
    await page.evaluate(async () => {
      const { startGaitCheck } = await import(new URL('js/movement/gait-watch.js', globalThis.location.href).href);
      globalThis.__gait = startGaitCheck(globalThis.__game);
    });
    const cdp = phone ? await ctx.newCDPSession(page) : null;
    const touch = (type, x, y) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    // the pointer: the mouse on desktop, one finger on a phone
    const ptr = {
      down: async (x, y) => (cdp ? touch('touchStart', x, y) : (await page.mouse.move(x, y), page.mouse.down())),
      move: (x, y) => (cdp ? touch('touchMove', x, y) : page.mouse.move(x, y)),
      up: () => (cdp ? touch('touchEnd') : page.mouse.up()),
      click: (x, y) => (cdp ? page.touchscreen.tap(x, y) : page.mouse.click(x, y)),
    };
    return { page, ptr };
  }
  const eric = (page) => page.evaluate(() => globalThis.__eric());
  const gait = async (page, tag) => {
    for (const l of await page.evaluate(() => globalThis.__gait.reports())) bad(`${tag} gait: ${l}`);
  };

  // hold, and keep the pointer ahead of Eric on the way to each goal until he gets there; then let go
  async function steerThrough(page, ptr, goals, tag) {
    const e0 = await eric(page);
    // the first press goes on bare floor ahead of him (a press on a person or a thing uses it instead)
    const start = await page.evaluate((g) => {
      const [w, h] = [globalThis.innerWidth, globalThis.innerHeight];
      for (const d of [1.6, 1.2, 2.2, 0.9, 0.7, 2.8, 3.4]) {
        const { s } = globalThis.__lead(g, d);
        const shown = s[0] > 20 && s[1] > 90 && s[0] < w - 20 && s[1] < h - 20;
        if (shown && !globalThis.__onTarget(...s)) return s;
      }
      return null;
    }, goals[0]);
    if (!start) return bad(`${tag}: no bare floor to press on ahead of Eric`);
    await ptr.down(...start);
    let reached = 0,
      inWall = 0,
      off = 0,
      steered = false,
      shot = 0;
    for (const g of goals) {
      const t0 = Date.now();
      for (;;) {
        const { s, d } = await page.evaluate((g) => globalThis.__lead(g), g);
        if (d < 0.7) {
          reached++;
          break;
        }
        if (Date.now() - t0 > 20000) break;
        if (s[0] < 0 || s[1] < 0 || s[0] > W || s[1] > H) off++;
        await ptr.move(Math.min(W - 2, Math.max(2, s[0])), Math.min(H - 2, Math.max(2, s[1])));
        await sleep(60);
        const e = await eric(page);
        steered ||= e.steer;
        if (!e.free) inWall++;
        if (e.steer && e.moving && ++shot === 15) {
          await page.screenshot({ path: `${out}/${tag}-steering.png` });
        }
      }
    }
    const atUp = await eric(page);
    await ptr.up();
    await sleep(1500);
    const after = await eric(page);
    const drift = Math.hypot(after.x - atUp.x, after.z - atUp.z) / atUp.k;
    console.log(
      `${tag}: steered ${steered}, reached ${reached}/${goals.length} goals from ${e0.x.toFixed(1)},${e0.z.toFixed(1)}; after release moved ${drift.toFixed(2)} m, steer ${after.steer}, moving ${after.moving}; frames in a wall ${inWall}, pointer off screen ${off}`,
    );
    if (!steered) bad(`${tag}: holding never steered`);
    if (reached < goals.length) bad(`${tag}: reached only ${reached}/${goals.length} goals`);
    if (after.steer || after.moving || after.path) bad(`${tag}: still walking after release`);
    if (drift > 0.8) bad(`${tag}: walked ${drift.toFixed(2)} m after release`);
    if (inWall) bad(`${tag}: ${inWall} frames inside a wall or furniture`);
  }

  // a quick click on bare floor near Eric walks there as before, without steering
  async function quickClick(page, ptr, tag) {
    const tgt = await page.evaluate(() => {
      const P = globalThis.__game.place,
        K = P.charScale || 1,
        e = globalThis.__game.player.root.position;
      for (const d of [1.5, 1.1, 2.2])
        for (let i = 0; i < 8; i++) {
          const q = [e.x + Math.cos((i * Math.PI) / 4) * d * K, e.z + Math.sin((i * Math.PI) / 4) * d * K];
          const on = globalThis.__onTarget(...globalThis.__scr(...q));
          if (P.nav.free(q[0], q[1]) && P.nav.clear([e.x, e.z], q) && !on) return q;
        }
      return null;
    });
    if (!tgt) bad(`${tag}: no clear floor next to Eric`);
    else {
      await ptr.click(...(await page.evaluate((t) => globalThis.__scr(t[0], t[1]), tgt)));
      await sleep(120);
      const c1 = await eric(page);
      let cSteer = c1.steer;
      for (let i = 0; i < 60 && (await eric(page)).path; i++) {
        await sleep(100);
        cSteer ||= (await eric(page)).steer;
      }
      await sleep(400);
      const c2 = await eric(page);
      const miss = Math.hypot(c2.x - tgt[0], c2.z - tgt[1]) / c2.k;
      console.log(`${tag}: walked a path ${c1.path}, steered ${cSteer}, ended ${miss.toFixed(2)} m from the click`);
      if (!c1.path || cSteer || miss > 0.5) bad(`${tag}: a quick click no longer walks to the point`);
    }
  }

  // ---- the plaza: round the fountain ----
  {
    const { page, ptr } = await open('plaza');
    const goals = await page.evaluate(() => {
      const P = globalThis.__game.place,
        K = P.charScale || 1,
        f = P.things.fountain,
        c = f.face(),
        s = f.spot(),
        e = globalThis.__game.player.root.position;
      const R = Math.hypot(s[0] - c[0], s[1] - c[1]) + 0.6 * K;
      const a0 = Math.atan2(e.z - c[1], e.x - c[0]);
      const pts = [];
      for (let i = 0; i <= 4; i++) {
        const a = a0 + (i / 4) * Math.PI * 1.2;
        const x = c[0] + Math.cos(a) * R,
          z = c[1] + Math.sin(a) * R;
        if (P.nav.free(x, z)) pts.push([x, z]);
      }
      return pts;
    });
    await steerThrough(page, ptr, goals, 'plaza-fountain');
    await page.screenshot({ path: `${out}/plaza-after.png` });
    await quickClick(page, ptr, 'plaza-click');
    await gait(page, 'plaza');
    await page.close();
  }

  // ---- the office: steer across to two far things, then a quick click ----
  {
    const { page, ptr } = await open('office');
    const goals = await page.evaluate(() => {
      const G = globalThis.__game,
        P = G.place,
        e = G.player.root.position,
        here = [e.x, e.z];
      const spots = G.markers.list
        .filter((m) => m.enabled() && m.spot)
        .map((m) => m.spot())
        .filter((s) => s && P.nav.free(s[0], s[1]));
      const a = spots.find((s) => globalThis.__len(here, s) > 5 && globalThis.__len(here, s) < 12);
      const b = a && spots.find((s) => globalThis.__len(a, s) > 4 && globalThis.__len(a, s) < 10);
      return [a, b].filter(Boolean);
    });
    if (goals.length < 2) bad(`office: only ${goals.length} steer goals found`);
    if (goals.length) await steerThrough(page, ptr, goals, 'office-across');
    await gait(page, 'office');
    await page.close();
  }

  // ---- the train: a click, then a held press, on Mio: both target her and never steer ----
  {
    const { page, ptr } = await open('train');
    for (const hold of [0, 700]) {
      const label = hold ? `held ${hold} ms` : 'click';
      const m = await page.evaluate(() => {
        const G = globalThis.__game,
          r = [G.place.people?.mio, G.mioNpc].find((x) => x?.root?.visible && x.root.parent);
        if (!r) return null;
        const v = r.root.position.clone();
        r.root.getWorldPosition(v);
        v.y += 0.45 * (G.place.charScale || 1);
        v.project(G.place.camera);
        return [((v.x + 1) / 2) * globalThis.innerWidth, ((1 - v.y) / 2) * globalThis.innerHeight];
      });
      if (!m) {
        bad('train: Mio is not there to click');
        break;
      }
      await ptr.down(m[0], m[1]);
      let st = false;
      for (let t = 0; t < hold; t += 100) {
        await sleep(100);
        st ||= (await eric(page)).steer;
      }
      await ptr.up();
      let r = {};
      for (let i = 0; i < 40; i++) {
        await sleep(200);
        r = await page.evaluate(() => ({
          menu: !globalThis.document.getElementById('actMenu').hidden,
          talk: !globalThis.document.getElementById('talk').hidden,
          busy: !!globalThis.__game.busy,
          steer: !!globalThis.__game.walker.steer,
        }));
        st ||= r.steer;
        if (r.menu || r.talk || r.busy) break;
      }
      console.log(`mio (${label}): menu ${r.menu}, talk ${r.talk}, busy ${r.busy}, steered ${st}`);
      if (!(r.menu || r.talk || r.busy) || st) bad(`mio ${label}: didn't target Mio, or steered`);
      await page.screenshot({ path: `${out}/mio-${hold ? 'held' : 'click'}.png` });
      for (let i = 0; i < 60; i++) {
        const open = await page.evaluate(
          () => !!globalThis.__game.busy || !globalThis.document.getElementById('actMenu').hidden,
        );
        if (!open) break;
        await page.keyboard.press(i % 2 ? 'Escape' : 'Space');
        await sleep(300);
      }
    }
    await page.close();
  }
});
console.log(fails.length ? 'FAIL' : 'PASS', `${W}x${H}`, out);
process.exitCode = fails.length ? 1 : 0;
