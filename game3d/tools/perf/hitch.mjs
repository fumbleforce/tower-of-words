// Preparation hitches: how much a place built in the background stalls the frames of the place being played.
// node game3d/tools/perf/hitch.mjs [w] [h] [from:to ...]   (default 1366 860 forecourt:office forecourt:plaza)
// Opens <from> (its own background preload switched off), lets it settle, then calls game.prepare(<to>) while
// recording every frame and every long task (over 50 ms) until the preparation and the draw-call pass are done.
// Prints per trip: preparation time, longest task, long tasks, worst frame and the 1% low (fps). BASE=<dir> for a
// worktree (default game3d), CPU=4 for a CPU slowed down 4x like perf.mjs's phone, Q=<tier> (default 1; the fast
// test plays at 0). Runs through tools/lib/browser-job.mjs (GPU slot; GL=soft for software rendering).
// A trip written from>to measures the entry instead: <to> is prepared first and left to settle, then game.travel(<to>)
// walks out of <from> and into <to> while frames, long tasks and the time spent in WebGL calls are recorded (shader
// compile and link, texture uploads) and the snapshot for the crossfade; printed for the worst frame of the entry.
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const args = process.argv.slice(2);
const [W, H] = [+(args[0] || 1366), +(args[1] || 860)];
const trips = (args.slice(2).length ? args.slice(2) : ['forecourt:office', 'forecourt:plaza']).map((t) => [...t.split(/[:>]/), t.includes('>')]);
const base = process.env.BASE || 'game3d';
const out = [];
await withBrowserJob('perf-hitch', async (browser) => {
  for (const [from, to, entry] of trips) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    if (+process.env.CPU > 1)
      await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // no preload of the next place on start: this tool starts it itself
    await page.route('**/js/main.js*', async (r) => {
      const res = await r.fetch();
      const src = await res.text();
      const line = 'if (NEXT[start]) setTimeout(() => prepare(NEXT[start]), 1500);';
      if (!src.includes(line)) throw new Error('main.js preload line not found');
      await r.fulfill({ response: res, body: src.replace(line, '') });
    });
    await page.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => [e.startTime, e.duration]))).observe({
        type: 'longtask',
        buffered: true,
      });
      window.__fr = [];
      window.__pc = new Map(); // frame time -> programs so far
      const f = (t) => {
        window.__fr.push(t);
        const n = window.__game?.renderer?.info?.programs?.length;
        if (n !== undefined) window.__pc.set(t, n);
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
      // time spent inside WebGL calls and the crossfade snapshot, by kind (calls over 0.5 ms)
      window.__gl = [];
      window.__glDetail = /[?&]gldetail/.test(location.search);
      const kinds = {
        compileShader: 'shader',
        linkProgram: 'shader',
        getProgramParameter: 'shader',
        getShaderParameter: 'shader',
        getProgramInfoLog: 'shader',
        getShaderInfoLog: 'shader',
        texImage2D: 'texture',
        texSubImage2D: 'texture',
        texStorage2D: 'texture',
        generateMipmap: 'texture',
        bufferData: 'buffer',
        readPixels: 'read',
      };
      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext])
        for (const [m, kind] of Object.entries(kinds)) {
          const orig = C.prototype[m];
          if (!orig) continue;
          C.prototype[m] = function (...a) {
            const t = performance.now();
            const r = orig.apply(this, a);
            const d = performance.now() - t;
            if (d > 0.5) {
              // GLDETAIL=1: by method, and the program's material and first defines for program calls
              const prog = m === 'getProgramInfoLog' && window.__game?.renderer?.info?.programs?.find((p) => p.program === a[0]);
              const what = prog ? `${m}:${prog.name}/${prog.cacheKey.split(',').slice(0, 3).join('.')}` : m;
              window.__gl.push([t, d, window.__glDetail ? what : kind]);
            }
            return r;
          };
        }
      const tdu = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...a) {
        const t = performance.now();
        const r = tdu.apply(this, a);
        window.__gl.push([t, performance.now() - t, 'snapshot']);
        return r;
      };
      // the snapshot as main.js takes it now: the WebGL canvas copied into the #xfade canvas
      const C2D = window.CanvasRenderingContext2D;
      const di = C2D.prototype.drawImage;
      C2D.prototype.drawImage = function (src, ...a) {
        const t = performance.now();
        const r = di.call(this, src, ...a);
        if (src instanceof HTMLCanvasElement) window.__gl.push([t, performance.now() - t, 'snapshot']);
        return r;
      };
    });
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?place=${from}&skip&q=${process.env.Q ?? 1}${process.env.GLDETAIL ? "&gldetail" : ""}`);
    await page.waitForFunction(() => window.__game?.place && window.__game.walker, null, { timeout: 60000 });
    await page.waitForTimeout(4000); // shaders compiled, start scene under way
    // lines on the way (the lift ride) wait for the player: press Enter for them
    const keys = entry ? setInterval(() => page.keyboard.press('Enter').catch(() => {}), 400) : null;
    const r = entry ? await page.evaluate(measureEntry, to).finally(() => clearInterval(keys)) : await page.evaluate(async (to) => {
      const g = window.__game;
      if (g.prepared[to]) return { error: `${to} already prepared` };
      const t0 = performance.now();
      await g.prepare(to);
      const t1 = performance.now();
      // the draw-call pass (office) works in slices after prepare; wait until it's idle, then 1 s more
      await new Promise((res) => setTimeout(res, 2500));
      const t2 = performance.now();
      const fr = window.__fr.filter((t) => t >= t0 && t <= t2);
      const dts = fr.slice(1).map((t, i) => t - fr[i]).sort((a, b) => a - b);
      const lt = window.__lt.filter(([s, d]) => s + d >= t0 && s <= t2).map(([, d]) => d);
      const p99 = dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.99))];
      return {
        prepMs: Math.round(t1 - t0),
        longest: Math.round(Math.max(0, ...lt)),
        longTasks: lt.length,
        worstFrame: Math.round(dts[dts.length - 1]),
        p99: +p99.toFixed(1),
        low1: +(1000 / p99).toFixed(1),
        median: +dts[dts.length >> 1].toFixed(1),
        frames: dts.length,
        slow: dts.filter((d) => d > 1.5 * dts[dts.length >> 1]).length,
        slowAt: fr.slice(1).map((t, i) => [Math.round(fr[i] - t0), Math.round(t - fr[i])]).filter(([, d]) => d > 25),
        prepEnd: Math.round(t1 - t0),
        look: g.prepared[to] && (await g.prepared[to]).place.look,
      };
    }, to);
    const row = { size: `${W}x${H}${+process.env.CPU > 1 ? ' cpu' + process.env.CPU + 'x' : ''}`, trip: `${from}->${to}`, ...r, errors };
    out.push(row);
    if (entry)
      console.log(
        `${row.size} ${row.trip} (entry): worst frame ${r.worstFrame} ms at ${r.worstAt} ms, longest task ${r.longest} ms, ` +
          `in that frame: ${Object.entries(r.inWorst || {}).map(([k, v]) => `${k} ${v} ms`).join(', ') || 'no GL call over 0.5 ms'}; ` +
          `whole entry: ${Object.entries(r.total || {}).map(([k, v]) => `${k} ${v} ms`).join(', ')}; programs ${r.programs}; ` +
          `frames over 50 ms: ${r.slowAt.map(([a, d]) => `${d}@${a}`).join(' ')}` +
          (r.error ? ` ERROR ${r.error}` : '') +
          (errors.length ? ` page errors: ${errors.join(' | ')}` : ''),
      );
    if (entry) {
      console.log(`  programs compiled in the worst frame: ${r.inWorstPrograms.join(' | ') || 'none'}`);
      if (process.env.PROGRAMS) console.log(r.newPrograms.join('\n'));
    } else
      console.log(
      `${row.size} ${row.trip}: prepare ${r.prepMs} ms, longest task ${r.longest} ms, ${r.longTasks} long tasks, ` +
        `worst frame ${r.worstFrame} ms, ${r.slow}/${r.frames} slow frames, 1% low ${r.low1} fps (p99 ${r.p99} ms), median ${r.median} ms` +
        (r.look ? `, look ${r.look.ms} ms` : '') +
        (r.error ? ` ERROR ${r.error}` : '') +
        (errors.length ? ` page errors: ${errors.join(' | ')}` : ''),
    );
    await ctx.close();
  }
});
const dir = new URL('../../shots/perf/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL(`hitch-${W}x${H}-cpu${process.env.CPU || 1}-${Date.now()}.json`, dir), JSON.stringify(out, null, 2));

// runs in the page: prepare <to>, settle, then travel there and report the entry's frames and GL time
async function measureEntry(to) {
  const g = window.__game;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  await g.prepare(to);
  await wait(3000); // the draw-call pass's slices
  const progs = () => g.renderer?.info?.programs?.length ?? '?';
  const p0 = progs();
  const before = new Set(g.renderer.info.programs);
  const t0 = performance.now();
  g.timeScale = (g.timeScale || 1) * 4; // the walk out, faster (frame work is the same)
  await g.travel(to);
  await wait(2000);
  const t2 = performance.now();
  const fr = window.__fr.filter((t) => t >= t0 && t <= t2);
  const iv = fr.slice(1).map((t, i) => [fr[i], t]);
  const dts = iv.map(([a, b]) => b - a);
  const wi = dts.indexOf(Math.max(...dts));
  const [ws, we] = iv[wi];
  const sum = (list) =>
    list.reduce((o, [, d, k]) => ((o[k] = +((o[k] || 0) + d).toFixed(1)), o), {});
  const gl = window.__gl.filter(([t]) => t >= t0 && t <= t2);
  const lt = window.__lt.filter(([s, d]) => s + d >= t0 && s <= t2).map(([, d]) => d);
  return {
    worstFrame: Math.round(dts[wi]),
    worstAt: Math.round(ws - t0),
    longest: Math.round(Math.max(0, ...lt)),
    inWorst: sum(gl.filter(([t]) => t >= ws && t <= we)),
    total: sum(gl),
    programs: `${p0} -> ${progs()}`,
    inWorstPrograms: g.renderer.info.programs.slice(window.__pc.get(ws), window.__pc.get(we)).map((p) => p.name + ' ' + p.cacheKey.split(',').slice(0, 2).join(',')),
    newPrograms: g.renderer.info.programs.filter((p) => !before.has(p)).map((p) => [p.cacheKey, g.renderer.info.programs.filter((q) => q !== p && q.cacheKey.split(",")[0] === p.cacheKey.split(",")[0]).map((q) => q.cacheKey.split(",").map((v, i, a) => (v === p.cacheKey.split(",")[i] ? "" : i + ":" + v + "/" + p.cacheKey.split(",")[i])).filter(Boolean).join(" ")).sort((a, b) => a.length - b.length)[0]].join("\n  closest differs: ")),
    slowAt: iv.map(([a, b]) => [Math.round(a - t0), Math.round(b - a)]).filter(([, d]) => d > 50),
    frames: dts.length,
  };
}
