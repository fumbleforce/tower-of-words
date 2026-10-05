// The title left open: frame time, the renderer's counts, JS heap, scene objects and queued animation-frame
// callbacks, sampled over time, to catch anything that grows while the title sits idle.
//   node game3d/tools/title-idle.mjs [secs=120] [every=10] [size=desktop|wide|phone] [audio=1]
// BASE=.claude/worktrees/<name>/game3d measures a worktree; QS='?w=320&h=200' adds a query. GL=soft: software GL.
// fps: animation frames a second; draws: frames the game drew. vramMB: video memory held by this run's Chromium (nvidia-smi). loopMs: the game loop's script time a frame; otherMs: the other animation-frame callbacks; drawMs: the loop plus
// waiting for the GPU to finish that frame (over 30 frames with a 1-pixel read after each draw).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";

// the video memory our own Chromium's GPU process holds (nvidia-smi), in MB; 0 if it can't be read
function ourGpuMB() {
  const kids = new Map();
  for (const name of fs.readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const st = fs.readFileSync(`/proc/${name}/stat`, "utf8");
      const ppid = +st.slice(st.lastIndexOf(")") + 2).split(" ")[1];
      if (!kids.has(ppid)) kids.set(ppid, []);
      kids.get(ppid).push(+name);
    } catch {}
  }
  const ours = new Set(),
    todo = [process.pid];
  while (todo.length)
    for (const k of kids.get(todo.pop()) || []) ours.add(k) && todo.push(k);
  try {
    const out = execFileSync(
      "nvidia-smi",
      ["--query-compute-apps=pid,used_memory", "--format=csv,noheader,nounits"],
      {
        encoding: "utf8",
      },
    );
    return out
      .split("\n")
      .map((l) => l.split(",").map((x) => +x.trim()))
      .filter(([pid]) => ours.has(pid))
      .reduce((a, [, mb]) => a + mb, 0);
  } catch {
    return 0;
  }
}

const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith(k + "=")) || "").split("=")[1] || d;
const SECS = +arg("secs", 120),
  EVERY = +arg("every", 10);
const VIEW = {
  desktop: { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 },
  wide: { viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
}[arg("size", "desktop")];
const url = `http://127.0.0.1:8771/${process.env.BASE || "game3d"}/index.html${process.env.QS || ""}`;

await withBrowserJob(
  "title-idle",
  async (browser) => {
    const ctx = await browser.newContext(VIEW);
    const p = await ctx.newPage();
    p.on("pageerror", (e) => console.log("pageerror", e.message));
    // count callbacks waiting in requestAnimationFrame (more than a few means loops are stacking)
    await ctx.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window),
        caf = window.cancelAnimationFrame.bind(window);
      const live = new Set();
      window.__rafLive = live;
      window.__rafCalls = 0;
      window.__rafMs = { main: 0, other: 0, sync: 0 };
      // Web Audio nodes made so far (a sound that keeps making nodes shows here)
      window.__audioNodes = 0;
      const AC = window.AudioContext && window.AudioContext.prototype;
      if (AC)
        for (const k of Object.getOwnPropertyNames(AC).filter((k) =>
          /^create/.test(k),
        )) {
          const f = AC[k];
          AC[k] = function (...a) {
            window.__audioNodes++;
            return f.apply(this, a);
          };
        }
      const AC0 = window.AudioContext;
      if (AC0)
        window.AudioContext = class extends AC0 {
          constructor(...a) {
            super(...a);
            window.__actx = this;
          }
        };
      window.requestAnimationFrame = (cb) => {
        window.__rafCalls++;
        const main = /gl-guard/.test(new Error().stack.split("\n")[2] || "");
        const id = raf((t) => {
          live.delete(id);
          const s = performance.now();
          cb(t);
          const e = performance.now();
          window.__rafMs[main ? "main" : "other"] += e - s;
          // the GPU's share: wait for the frame just drawn to finish (a 1-pixel read), when asked
          if (main && window.__syncGpu) {
            const gl = window.__game?.renderer?.getContext();
            gl?.readPixels(
              0,
              0,
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              new Uint8Array(4),
            );
            window.__rafMs.sync += performance.now() - e;
          }
        });
        live.add(id);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        live.delete(id);
        caf(id);
      };
    });
    await p.goto(url);
    await p.waitForFunction(
      () =>
        document.body.classList.contains("at-title") && window.__shellBooted,
      null,
      {
        timeout: 120000,
      },
    );
    const cdp = await ctx.newCDPSession(p);
    // audio=1: a key press the title ignores, so the page may start sound (as it can in a browser he has played in)
    if (arg("audio", "0") === "1") {
      await p.keyboard.press("KeyQ");
      await p.evaluate(() => window.__actx?.resume());
    }
    const t0 = Date.now();
    console.log(
      "t(s)  fps  draws  ms/f  calls  tris     geo  tex  prog  objs   heapMB  vramMB rafLive  rafPerFrame  dom  audio:nodes  loopMs otherMs  drawMs",
    );
    while (true) {
      const r = await p.evaluate(async () => {
        const g = window.__game,
          ren = g.renderer;
        ren.info.autoReset = false;
        window.__perfHold = true;
        ren.info.reset();
        await new Promise((ok) =>
          requestAnimationFrame(() => requestAnimationFrame(ok)),
        );
        const calls = ren.info.render.calls,
          tris = ren.info.render.triangles;
        ren.info.autoReset = true;
        window.__perfHold = false;
        // frames the game drew (the loop may skip some: the title draws at most 30 a second)
        if (!ren.__counted) {
          ren.__counted = true;
          const r0 = ren.render.bind(ren);
          ren.render = (...a) => {
            window.__drew = true;
            return r0(...a);
          };
        }
        const c0 = window.__rafCalls;
        const ms0 = { ...window.__rafMs };
        let n = 0,
          drawn = 0;
        window.__drew = false;
        const s = performance.now();
        await new Promise((ok) => {
          const f = () => {
            if (window.__drew) drawn++;
            window.__drew = false;
            if (++n < 60) requestAnimationFrame(f);
            else ok();
          };
          requestAnimationFrame(f);
        });
        const dt = performance.now() - s;
        const ms1 = { ...window.__rafMs };
        // then 30 frames that wait for the GPU after each draw
        window.__syncGpu = true;
        let k = 0;
        await new Promise((ok) => {
          const f = () => (++k < 30 ? requestAnimationFrame(f) : ok());
          requestAnimationFrame(f);
        });
        window.__syncGpu = false;
        const ms2 = { ...window.__rafMs };
        let objs = 0;
        g.place?.scene?.traverse(() => objs++);
        return {
          fps: (n * 1000) / dt,
          draws: (drawn * 1000) / dt,
          ms: dt / n,
          calls,
          tris,
          geo: ren.info.memory.geometries,
          tex: ren.info.memory.textures,
          prog: ren.info.programs?.length,
          objs,
          rafLive: window.__rafLive.size,
          rafPerFrame: (window.__rafCalls - c0) / n - 1,
          dom: document.getElementsByTagName("*").length,
          audio: `${window.__actx?.state || "-"}:${window.__audioNodes}`,
          mainMs: (ms1.main - ms0.main) / n,
          otherMs: (ms1.other - ms0.other) / n,
          gpuMs: (ms2.sync - ms1.sync + ms2.main - ms1.main) / k,
        };
      });
      const t = (Date.now() - t0) / 1000;
      const heap = (await cdp.send("Runtime.getHeapUsage")).usedSize / 1e6;
      console.log(
        [
          t.toFixed(0).padStart(4),
          r.fps.toFixed(1).padStart(5),
          r.draws.toFixed(1).padStart(5),
          r.ms.toFixed(1).padStart(6),
          String(r.calls).padStart(6),
          String(r.tris).padStart(7),
          String(r.geo).padStart(5),
          String(r.tex).padStart(4),
          String(r.prog).padStart(5),
          String(r.objs).padStart(6),
          heap.toFixed(1).padStart(8),
          String(ourGpuMB()).padStart(6),
          String(r.rafLive).padStart(8),
          r.rafPerFrame.toFixed(1).padStart(12),
          String(r.dom).padStart(5),
          r.audio.padStart(14),
          r.mainMs.toFixed(2).padStart(6),
          r.otherMs.toFixed(2).padStart(6),
          r.gpuMs.toFixed(2).padStart(6),
        ].join(" "),
      );
      if (t >= SECS) break;
      await p.waitForTimeout(EVERY * 1000);
    }
  },
  { timeoutMs: (SECS + 150) * 1000, gpuWaitMs: 280000 },
);
