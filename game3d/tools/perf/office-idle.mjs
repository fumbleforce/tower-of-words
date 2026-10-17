// Stationary B2 performance with the ordinary game loop and public content only.
// BASE=.claude/worktrees/<name>/game3d GL=opengl OUT=/tmp/office-idle node game3d/tools/perf/office-idle.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { withBrowserJob, gpuWaitOptions, exitDeferred } from "../../../tools/lib/browser-job.mjs";
import { scopedRoute } from "../../../tools/bible/check-scope.mjs";
const out = process.env.OUT || "/tmp/office-idle";
const at = (process.env.AT || "").split(",").filter(Boolean).map(Number);
const camera = process.env.CAMERA || "overview";
const baseline = process.env.BASELINE;
const baselineSource = baseline
  ? execFileSync(
      "git",
      ["show", `${baseline}:game3d/js/movement/traversal.js`],
      { encoding: "utf8" },
    )
  : null;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  "office-idle",
  async (browser) => {
    const ctx = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 2327, height: 1196 },
      deviceScaleFactor: 1.1,
    });
    const page = await ctx.newPage(),
      errors = [],
      scopeErrors = [];
    if (baselineSource)
      await page.route("**/js/movement/traversal.js*", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: baselineSource,
        }),
      );
    await ctx.route(
      "**/*",
      scopedRoute({
        publicOnly: true,
        onFailure: (e) => scopeErrors.push(String(e)),
      }),
    );
    await ctx.addInitScript((cameraMode) => {
      localStorage.setItem(
        "amakawa-settings",
        JSON.stringify({
          privateMode: false,
          frameCap: "off",
          quality: "high",
          cameraMode,
        }),
      );
      const raf = requestAnimationFrame.bind(globalThis);
      globalThis.__officeLoop = { on: false, cpu: [], sync: [] };
      globalThis.requestAnimationFrame = (cb) => {
        const main = /gl-guard/.test(new Error().stack.split("\n")[2] || "");
        return raf((t) => {
          const start = performance.now();
          cb(t);
          const data = globalThis.__officeLoop,
            end = performance.now();
          if (main && data.on) data.cpu.push(end - start);
          if (main && data.syncOn) {
            const gl = globalThis.__game?.renderer?.getContext();
            gl?.readPixels(
              0,
              0,
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              new Uint8Array(4),
            );
            data.sync.push(performance.now() - start);
          }
        });
      };
    }, camera);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `http://127.0.0.1:8771/${process.env.BASE || "game3d"}/index.html?place=office&skip&q=2&fps=0&mc=carina`,
    );
    await page.waitForFunction(
      () => globalThis.__done && globalThis.__game?.place?.name === "office",
    );
    await page.waitForTimeout(1500);
    // Finish the public arrival line through its ordinary key control, then measure free exploration.
    for (
      let i = 0;
      i < 40 && (await page.evaluate(() => globalThis.__game.busy));
      i++
    ) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
    }
    // The public greeting fixture runs Mori's normal reaction and releases his authored close-up.
    await page.evaluate(() => {
      globalThis.__game.runner.trigger("say:ohayo:mori");
    });
    for (
      let i = 0;
      i < 40 && (await page.evaluate(() => globalThis.__game.busy));
      i++
    ) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
    }
    await page.waitForFunction(
      () =>
        !globalThis.__game.busy &&
        !globalThis.__game.place.cam.close &&
        !globalThis.__game.place.cam.releasing,
    );
    if (at.length)
      await page.evaluate((position) => {
        const g = globalThis.__game;
        g.player.root.position.set(position[0], 0, position[1]);
        g.player.root.rotation.y = g.walker.facing = position[2] || 0;
        g.place.cam.snap(g.player.root.position);
      }, at);
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const g = globalThis.__game,
        data = (globalThis.__officeTiming = {
          on: false,
          parts: {},
          frames: [],
        });
      const wrap = (object, key, name) => {
        if (typeof object?.[key] !== "function") return;
        const original = object[key];
        object[key] = function (...args) {
          const start = performance.now();
          const result = original.apply(this, args);
          if (data.on)
            (data.parts[name] ||= []).push(performance.now() - start);
          return result;
        };
      };
      wrap(g.place, "update", "placeUpdate");
      wrap(g.jump, "update", "jumpCPU");
      wrap(g.walker, "update", "walkerCPU");
      wrap(g.followCamera, "afterStep", "followCPU");
      wrap(g.place.perf, "check", "batchCheck");
      wrap(g.renderer.shadowMap, "render", "shadowCPU");
      for (const pass of g.view.composer.passes)
        wrap(pass, "render", pass.constructor.name);
      wrap(g.view.post, "render", "postCPU");
    });
    const results = [];
    for (const variant of process.env.ONLY_BASE
      ? ["base", "baseAgain"]
      : ["base", "aoOff", "msaa0", "shadowOff", "baseAgain"]) {
      await page.evaluate((name) => {
        const g = globalThis.__game;
        globalThis.__undoOffice?.();
        globalThis.__undoOffice = null;
        if (name === "aoOff") {
          const ao = g.view.post.gtao,
            enabled = ao.enabled;
          ao.enabled = false;
          globalThis.__undoOffice = () => {
            ao.enabled = enabled;
          };
        }
        if (name === "msaa0") {
          const targets = [
              g.view.composer.renderTarget1,
              g.view.composer.renderTarget2,
            ],
            samples = targets.map((t) => t.samples);
          targets.forEach((t) => {
            t.samples = 0;
            t.dispose();
          });
          globalThis.__undoOffice = () =>
            targets.forEach((t, i) => {
              t.samples = samples[i];
              t.dispose();
            });
        }
        if (name === "shadowOff") {
          const enabled = g.renderer.shadowMap.enabled;
          g.renderer.shadowMap.enabled = false;
          globalThis.__undoOffice = () => {
            g.renderer.shadowMap.enabled = enabled;
          };
        }
      }, variant);
      await page.waitForTimeout(1000);
      const result = await page.evaluate(async (name) => {
        const g = globalThis.__game,
          data = globalThis.__officeTiming,
          info = g.renderer.info;
        const start = performance.now(),
          drawn = g.view.draws,
          calls = [],
          triangles = [];
        data.parts = {};
        data.on = true;
        globalThis.__officeLoop.cpu = [];
        globalThis.__officeLoop.on = true;
        info.autoReset = false;
        globalThis.__perfHold = true;
        for (let i = 0; i < 180; i++) {
          info.reset();
          await new Promise((r) => requestAnimationFrame(r));
          calls.push(info.render.calls);
          triangles.push(info.render.triangles);
        }
        data.on = false;
        globalThis.__officeLoop.on = false;
        info.autoReset = true;
        globalThis.__perfHold = false;
        const median = (rows) =>
          [...rows].sort((a, b) => a - b)[rows.length >> 1];
        return {
          variant: name,
          loopCPU: median(globalThis.__officeLoop.cpu),
          busy: g.busy,
          follow: g.followCamera.active,
          camera: g.place.camera.position.toArray(),
          fps: ((g.view.draws - drawn) * 1000) / (performance.now() - start),
          draws: g.view.draws - drawn,
          calls: median(calls),
          triangles: median(triangles),
          parts: Object.fromEntries(
            Object.entries(data.parts).map(([k, v]) => [
              k,
              {
                median: median(v),
                average: v.reduce((a, b) => a + b, 0) / v.length,
              },
            ]),
          ),
          gpu: g.renderer.userData,
          quality: g.view.quality,
          size: [g.renderer.domElement.width, g.renderer.domElement.height],
          position: g.player.root.position.toArray(),
          cap: g.view.activeCap(),
          node: g.runner.currentNode,
        };
      }, variant);
      if (process.env.GL === "opengl")
        assert.match(
          result.gpu.gpu,
          /OpenGL/,
          "The requested backend must be OpenGL",
        );
      assert.equal(result.busy, false, "Measure free exploration");
      assert.equal(result.node, "", "No active story node");
      await page.screenshot({ path: `${out}/${variant}.png` });
      result.syncedDrawMs = await page.evaluate(async () => {
        const data = globalThis.__officeLoop;
        data.sync = [];
        data.syncOn = true;
        for (let i = 0; i < 30; i++)
          await new Promise((r) => requestAnimationFrame(r));
        data.syncOn = false;
        return [...data.sync].sort((a, b) => a - b)[data.sync.length >> 1];
      });
      results.push(result);
      console.log(JSON.stringify(result));
    }
    fs.writeFileSync(
      `${out}/results.json`,
      JSON.stringify(
        {
          base: process.env.BASE || "game3d",
          traversalBaseline: baseline || null,
          backend: process.env.GL || "vulkan",
          camera,
          at,
          viewport: [2327, 1196],
          dpr: 1.1,
          results,
          errors,
          scopeErrors,
        },
        null,
        2,
      ),
    );
    if (errors.length || scopeErrors.length)
      throw Error(JSON.stringify({ errors, scopeErrors }));
    await ctx.close();
  },
  {
    gpuLock: `office-idle-${process.pid}`,
    ...gpuWaitOptions(900, 120000),
  },
).catch(exitDeferred);
