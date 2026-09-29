// Soft collision check (move.js softSeparate / slideStep / press): people in tight spots push gently and never lock.
// Runs short scripted scenes with the game paused and stepped by hand (game.step at 1/30 s), so it's fast and exact:
//   office A  Mori standing in the copy room doorway, Eric walks through him into the copy room
//   office B  Eric standing in the doorway, Mori walks through into the copy room
//   office C  head-on in the doorway: Mori walks out while Eric walks in
//   train     a passenger walks down the aisle past Eric standing in it, then Eric walks back past them
// Each checks: the walk arrives (no stall), nobody ends up in a wall or off the walk grid, and how long anyone overlapped.
// Saves a shot per scene under game3d/shots/soft-collision/.
//   sh game3d/tools/with-browser-lock.sh soft-collision node game3d/tools/soft-collision.mjs
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = 'game3d/shots/soft-collision'; fs.mkdirSync(OUT, { recursive: true });
let gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], gpu = false;
const GLOCK = '/tmp/claude-1000/gpu.lock';
try { fs.mkdirSync(GLOCK); fs.writeFileSync(GLOCK + '/owner', 'soft-collision'); gpu = true; gl = ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']; } catch {}
const unGpu = () => { if (gpu) try { fs.rmSync(GLOCK, { recursive: true, force: true }); } catch {} gpu = false; };
process.on('exit', unGpu);
const kill = setTimeout(() => { console.log('TIMEOUT'); unGpu(); process.exit(2); }, 280000);
console.log('GL', gpu ? 'gpu' : 'swiftshader');
const b = await chromium.launch({ headless: true, args: gl });
const errs = [];
let fails = 0;

// in the page: step the game by hand and watch everyone who moves
const SIM = () => {
  window.__sim = async (sec, until, movers) => {
    const G = window.__game, P = G.place, nav = P.nav;
    let t = 0, wall = [], over = 0, maxOver = 0, overT = 0;
    const bodies = () => movers.map((m) => (m === 'eric' ? G.player : P.people[m])).filter(Boolean);
    while (t < sec) {
      G.step(1 / 30); t += 1 / 30;
      const bs = bodies();
      for (const [i, r] of bs.entries()) {
        const p = r.root.position;
        if (!nav.free(p.x, p.z, nav.R - 0.04) && wall.length < 5) wall.push(`${movers[i]} in a wall at [${p.x.toFixed(2)}, ${p.z.toFixed(2)}] t=${t.toFixed(2)}`);
      }
      if (bs.length === 2) {
        const [a, c] = bs, d = Math.hypot(a.root.position.x - c.root.position.x, a.root.position.z - c.root.position.z), rr = 0.48 * (P.charScale || 1);
        if (d < rr - 0.03) { overT += 1 / 30; over = Math.max(over, overT); maxOver = Math.max(maxOver, rr - d); } else overT = 0;
      }
      if (until && until()) break;
      if (Math.round(t * 30) % 10 === 0) await new Promise((r) => setTimeout(r, 0));   // let promises settle
    }
    return { t: +t.toFixed(2), wall, longestOverlap: +over.toFixed(2), deepest: +maxOver.toFixed(3), passes: (window.__moveCheck && window.__moveCheck.passes) || 0 };
  };
};

async function load(place) {
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  p.on('pageerror', (e) => errs.push(place + ': ' + e.message));
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?place=${place}&skip&q=0`);
  await p.waitForFunction(() => window.__game && window.__game.place && window.__game.walker, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.evaluate(SIM);
  await p.evaluate(() => { const G = window.__game; G.paused = true; G.busy = false; G.walker.locked = false; window.__moveCheck = window.__moveCheck || { passes: 0, notes: [] }; });
  return p;
}
const report = (name, r, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(r)}`); if (!ok) fails++; };
// frame the shot on a spot (the place camera's close-up), then shoot
const shot = async (p, name, at) => { if (at) await p.evaluate(([x, z]) => { const c = window.__game.place.cam; if (c && c.closeOn) { c.closeOn([x, z], 2.4); const v = window.__game.player.root.position; for (let i = 0; i < 40; i++) c.update?.(0.1, v); } }, at); await shot0(p, name); };
const shot0 = async (p, name) => { await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await p.screenshot({ path: `${OUT}/${name}.png` }); };

// ---------- office: the copy room doorway ----------
{
  const p = await load('office');
  // the doorway: the free gap in the copy room wall (z = 2.4, x < -2.2)
  const door = await p.evaluate(() => {
    const nav = window.__game.place.nav, xs = [];
    for (let x = -6.9; x < -2.2; x += 0.02) if (nav.free(x, 2.4)) xs.push(x);
    if (!xs.length) return null;
    // the first run of free x
    let a = xs[0], e = xs[0]; for (const x of xs) { if (x - e > 0.05) break; e = x; }
    return { x: (a + e) / 2, w: e - a };
  });
  console.log('copy room doorway', JSON.stringify(door));
  const put = (id, x, z, yaw = 0) => p.evaluate(([id, x, z, yaw]) => {
    const G = window.__game, r = id === 'eric' ? G.player : G.place.people[id];
    r.seated = false; r.root.visible = true; r.root.position.set(x, 0, z); r.root.rotation.y = yaw; r._walk = null; if (r.blob) r.blob.position.set(x, 0.004, z);
    if (id === 'eric') G.walker.sync();
  }, [id, x, z, yaw]);
  // spots either side: the nearest open floor straight in from the doorway and out in the corridor
  const [IN, OUTSIDE, OUT2] = await p.evaluate((D) => {
    const nav = window.__game.place.nav, near = (x, z) => { for (let r = 0; r < 1.5; r += 0.05) for (let a = 0; a < 16; a++) { const cx = x + Math.cos(a / 16 * Math.PI * 2) * r, cz = z + Math.sin(a / 16 * Math.PI * 2) * r; if (nav.free(cx, cz, nav.R + 0.12)) return [+cx.toFixed(2), +cz.toFixed(2)]; } return [x, z]; };
    return [near(D, 3.1), near(D, 1.6), near(D + 0.9, 1.3)];
  }, door.x);
  const D = door.x;
  console.log('spots: in', JSON.stringify(IN), 'out', JSON.stringify(OUTSIDE));
  const pos = (id) => p.evaluate((id) => { const G = window.__game, r = id === 'eric' ? G.player : G.place.people[id]; return [+r.root.position.x.toFixed(2), +r.root.position.z.toFixed(2)]; }, id);

  // A: Mori stands in the doorway, Eric walks through into the copy room
  await put('mori', D, 2.4, Math.PI); await put('eric', ...OUTSIDE);
  await p.evaluate(([x, z]) => window.__game.walker.goTo(x, z), IN);
  let r = await p.evaluate(([x, z]) => window.__sim(8, () => { const q = window.__game.player.root.position; return Math.hypot(q.x - x, q.z - z) < 0.15; }, ['eric', 'mori']), IN);
  r.eric = await pos('eric'); r.mori = await pos('mori');
  await shot(p, 'office-A-eric-through-mori', [D, 2.5]);
  report('office A (Eric walks through Mori standing in the doorway)', r, r.t < 8 && !r.wall.length);

  // A2: the same with keys held (not a tapped path): Eric pushes straight into him
  await put('mori', D, 2.4, Math.PI); await put('eric', ...OUTSIDE);
  await p.evaluate(() => { const G = window.__game; G.walker.stop(); });
  // keys are screen-relative: pick the key whose direction points most into the copy room (+z)
  const key = await p.evaluate(() => {
    const G = window.__game, cam = G.place.camera, v = cam.getWorldDirection(G.player.root.position.clone());
    const f = [v.x, v.z], n = Math.hypot(...f) || 1; f[0] /= n; f[1] /= n; const rgt = [-f[1], f[0]];
    const c = { KeyW: f[1], KeyS: -f[1], KeyD: rgt[1], KeyA: -rgt[1] };
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
  });
  await p.evaluate((k) => window.__game.walker.keys.add(k), key);
  r = await p.evaluate(() => window.__sim(8, () => window.__game.player.root.position.z > 2.7, ['eric', 'mori']));
  await p.evaluate(() => window.__game.walker.keys.clear());
  r.key = key; r.eric = await pos('eric'); r.mori = await pos('mori');
  await shot(p, 'office-A2-keys-into-mori', [D, 2.5]);
  report('office A2 (Eric holds a key into Mori in the doorway)', r, r.t < 8 && !r.wall.length);

  // B: Eric stands in the doorway, Mori walks through into the copy room
  await put('eric', D, 2.4); await put('mori', ...OUTSIDE, 0);
  r = await p.evaluate(([x, z]) => { const G = window.__game; window.__arr = false; G.place.walkPerson('mori', [x, z]).then(() => { window.__arr = true; }); return window.__sim(10, () => window.__arr, ['eric', 'mori']); }, IN);
  r.eric = await pos('eric'); r.mori = await pos('mori'); r.arrived = await p.evaluate(() => window.__arr);
  const dB = Math.hypot(r.mori[0] - IN[0], r.mori[1] - IN[1]);
  await shot(p, 'office-B-mori-through-eric', [D, 2.5]);
  report(`office B (Mori walks through Eric standing in the doorway; ends ${dB.toFixed(2)} from his spot)`, r, r.arrived && dB < 0.3 && !r.wall.length);

  // C: head-on in the doorway
  await put('mori', IN[0], IN[1], Math.PI); await put('eric', ...OUTSIDE);
  r = await p.evaluate(([i, o]) => {
    const G = window.__game; window.__arr = 0;
    G.place.walkPerson('mori', o).then(() => { window.__arr++; window.__moriEnd = G.t; });
    G.walker.goTo(i[0], i[1], () => { window.__arr++; });
    return window.__sim(10, () => window.__arr >= 2, ['eric', 'mori']);
  }, [IN, OUT2]);
  r.eric = await pos('eric'); r.mori = await pos('mori');
  // (Mori heads for a corridor spot clear of where Eric starts: a walk that ends on someone stops in front of them)
  const dCe = Math.hypot(r.eric[0] - IN[0], r.eric[1] - IN[1]), dCm = Math.hypot(r.mori[0] - OUT2[0], r.mori[1] - OUT2[1]);
  await shot(p, 'office-C-head-on', [D, 2.5]);
  report(`office C (head-on in the doorway; Eric ${dCe.toFixed(2)} from his spot, Mori ${dCm.toFixed(2)})`, r, dCe < 0.3 && dCm < 0.3 && !r.wall.length);

  // ---------- arm's length: people stopping next to Eric (runs in real time, walkRig at 4x) ----------
  await p.evaluate(() => { const G = window.__game; G.paused = false; G.timeScale = 4; });
  const gap = (id) => p.evaluate((id) => { const G = window.__game, P = G.place, K = P.charScale || 1, r = id === 'mio' ? G.mioNpc : P.people[id], a = r.root.position, e = G.player.root.position; return { d: +Math.hypot(a.x - e.x, a.z - e.z).toFixed(3), space: +(0.58 * K).toFixed(3), touch: +(0.48 * K).toFixed(3) }; }, id);
  // D: the end of the day: Eric at his desk, Mio walks to 'my_seat' (behind his chair) and faces him
  await p.evaluate(async () => {
    const G = window.__game, P = G.place, m = G.mioNpc;
    await P.capState('sit');
    m.root.visible = true; m.seated = false; m.root.position.set(-0.25, 0, 1.3);
    await G.runner.steps([{ do: 'walk', who: 'mio', to: 'my_seat', wait: true }, { do: 'face', who: 'mio', to: 'eric' }]);
  });
  let g1 = await gap('mio'); await p.waitForTimeout(1500); let g2 = await gap('mio');
  const mp = await p.evaluate(() => { const q = window.__game.mioNpc.root.position; return [q.x, q.z]; });
  await shot(p, 'talk-D-mio-end-of-day', mp);
  report(`talk D (end of day: Mio stops by Eric seated at his desk; ${g1.d} apart on arrival, ${g2.d} after 1.5 s, arm's length ${g2.space})`, { g1, g2 }, g2.d >= g2.space - 0.04);
  // E: Kenji is sent to a spot right next to Eric standing (0.2 away): he stops at arm's length
  await p.evaluate(() => { const G = window.__game; G.player.seated = false; G.player.setState?.('idle'); G.player.root.position.set(-0.6, 0, 1.3); G.walker.sync(); G.mioNpc.root.visible = false; });
  const kid = await p.evaluate(() => ['kenji', 'mori', 'emi'].find((id) => window.__game.place.people[id] && window.__game.place.people[id].hips));
  await p.evaluate(async (id) => {
    const G = window.__game, P = G.place, r = P.people[id];
    r.seated = false; r.root.position.y = 0; r.root.visible = true; r.root.position.set(1.0, 0, 1.3);
    await P.walkPerson(id, [-0.4, 1.3]);
  }, kid);
  g1 = await gap(kid); await p.waitForTimeout(1500); g2 = await gap(kid);
  await shot(p, 'talk-E-walk-next-to-eric', [-0.4, 1.3]);
  report(`talk E (${kid} sent to a spot 0.2 from Eric; ${g1.d} apart on arrival, ${g2.d} after 1.5 s)`, { g1, g2 }, g1.d >= g1.space - 0.04);
  // F: a scene puts Mori right on top of Eric (0.15 away): he steps back to arm's length on his own
  await p.evaluate(() => { const G = window.__game, r = G.place.people.mori; r.seated = false; r._walk = null; r.root.position.y = 0; r.root.visible = true; r.root.position.set(-0.45, 0, 1.3); });
  const wst = await p.evaluate(() => { const w = window.__game.walker; return { moving: w.moving, path: !!w.path, aside: !!w.aside, keys: w.keys.size, locked: w.locked, busy: window.__game.busy }; });
  await p.waitForTimeout(3500); g2 = await gap('mori'); g2.walker = wst;
  const wallF = await p.evaluate(() => { const P = window.__game.place, q = P.people.mori.root.position; return P.nav.free(q.x, q.z, P.nav.R - 0.04); });
  await shot(p, 'talk-F-placed-on-eric', [-0.6, 1.3]);
  report(`talk F (Mori placed 0.15 from Eric: ${g2.d} apart after 3.5 s, in open floor: ${wallF})`, { g2 }, g2.d >= g2.space - 0.06 && wallF);
  await p.close();
}

// ---------- train: the aisle ----------
{
  const p = await load('train');
  const info = await p.evaluate(() => {
    const G = window.__game, P = G.place, e = G.player.root.position;
    const ppl = Object.entries(P.people || {}).filter(([, r]) => r && r.hips && r.root && r.root.parent === P.space).map(([id]) => id);
    // the aisle runs along x through Eric's spot: find how far it goes each way
    const nav = P.nav; let x0 = e.x, x1 = e.x; while (nav.free(x0 - 0.1, e.z) && x0 > nav.x0) x0 -= 0.1; while (nav.free(x1 + 0.1, e.z) && x1 < nav.x1) x1 += 0.1;
    let z0 = e.z, z1 = e.z; while (nav.free(e.x, z0 - 0.05) && z0 > nav.z0) z0 -= 0.05; while (nav.free(e.x, z1 + 0.05) && z1 < nav.z1) z1 += 0.05;
    return { eric: [e.x, e.z], ppl, x: [x0, x1], z: [z0, z1], scale: P.charScale };
  });
  console.log('train', JSON.stringify(info));
  const id = info.ppl[0];
  if (!id) { console.log('FAIL train: no walking passenger found'); fails++; }
  else {
    const z = info.eric[1], ex = info.eric[0];
    // passenger starts 1.6 ahead along the aisle, walks 1.6 past Eric
    const A = [ex + 1.6, z], B = [ex - 1.6, z];
    await p.evaluate(([id, A]) => { const G = window.__game, r = G.place.people[id]; r.seated = false; r.root.visible = true; r.root.position.set(A[0], 0, A[1]); r._walk = null; G.walker.sync(); }, [id, A]);
    let r = await p.evaluate(([id, B]) => { const G = window.__game; window.__arr = false; G.place.walkPerson(id, B).then(() => { window.__arr = true; }); return window.__sim(10, () => window.__arr, ['eric', id]); }, [id, B]);
    const q = await p.evaluate((id) => { const r = window.__game.place.people[id].root.position; return [r.x, r.z]; }, id);
    const d = Math.hypot(q[0] - B[0], q[1] - B[1]);
    await shot(p, 'train-passenger-past-eric');
    report(`train (${id} walks down the aisle past Eric; ends ${d.toFixed(2)} from the spot)`, r, r.t < 10 && d < 0.3 && !r.wall.length);
    // then Eric walks back up the aisle past the passenger standing there
    await p.evaluate(([x, z]) => { window.__arr = false; window.__game.walker.goTo(x, z, () => { window.__arr = true; }); }, [ex - 3.0, z]);
    r = await p.evaluate((id) => window.__sim(10, () => window.__arr, ['eric', id]), id);
    const e2 = await p.evaluate(() => { const q = window.__game.player.root.position; return [q.x, q.z]; });
    const d2 = Math.hypot(e2[0] - (ex - 3.0), e2[1] - z);
    await shot(p, 'train-eric-past-passenger');
    report(`train (Eric walks up the aisle past ${id}; ends ${d2.toFixed(2)} from the spot)`, r, d2 < 0.3 && !r.wall.length);
  }
  await p.close();
}
await b.close();
clearTimeout(kill); unGpu();
if (errs.length) { console.log('page errors:\n  ' + errs.slice(0, 8).join('\n  ')); }
console.log(fails ? `FAIL ${fails}` : 'PASS all');
process.exit(fails ? 1 : 0);
