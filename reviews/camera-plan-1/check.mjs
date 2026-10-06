// Run from the repository root. BASE can point at a served worktree; screenshots stay outside git.
// BASE=http://127.0.0.1:8771/.claude/worktrees/codex-camera-demo/ node reviews/camera-plan-1/check.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";

const base = process.env.BASE || "http://127.0.0.1:8771/";
const out = process.env.OUT || "game3d/shots/camera-demo";
fs.mkdirSync(out, { recursive: true });
const results = [];
await withBrowserJob(
  "camera-demo-check",
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 600,
        isMobile: width < 600,
      });
      const page = await context.newPage();
      const errors = [],
        privateRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) => {
        if (new URL(route.request().url()).pathname.includes("/private/")) {
          privateRequests.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(
        new URL("reviews/camera-plan-1/frame.html", base).href.replace(
          "frame.html",
          "demo.css",
        ),
      );
      const sentinel = await page.evaluate(() => {
        globalThis.localStorage.setItem(
          "amakawa-save",
          '{"day":5,"sentinel":"keep this save"}',
        );
        globalThis.localStorage.setItem(
          "amakawa-settings",
          '{"v":2,"privateMode":true,"master":0.37}',
        );
        globalThis.sessionStorage.setItem(
          "camera-demo-sentinel",
          "keep this session",
        );
        return {
          local: { ...globalThis.localStorage },
          session: { ...globalThis.sessionStorage },
        };
      });
      for (const place of ["plaza", "office", "dorms", "train"]) {
        const url = new URL("reviews/camera-plan-1/demo.html", base);
        url.search = new URLSearchParams({ place, camera: "1a", touch: "2b" });
        await page.goto(url.href);
        await page.waitForFunction(
          () => globalThis.document.querySelector("#status").hidden,
          null,
          { timeout: 65000 },
        );
        const frame = page
          .frames()
          .find((frame) => frame.url().includes("/frame.html"));
        assert.ok(frame, "isolated game frame exists");
        assert.deepEqual(
          await frame.evaluate(() => ({
            private: globalThis.__settings.privateMode,
            saving: globalThis.__game.saveEnabled,
            idb: typeof indexedDB,
          })),
          { private: false, saving: false, idb: "undefined" },
        );
        const modes = [];
        for (const mode of ["1a", "1b", "1c", "orbit", "overview"]) {
          await page.selectOption("#camera", mode);
          await frame.waitForFunction(
            (mode) => globalThis.__cameraDemo.camera.mode === mode,
            mode,
          );
          await page.waitForTimeout(150);
          const state = await frame.evaluate(() => ({
            mode: globalThis.__cameraDemo.camera.mode,
            position: globalThis.__game.place.camera.position.toArray(),
            fov: globalThis.__game.place.camera.fov,
            blocked: globalThis.__cameraDemo.camera.blocked,
            distance: globalThis.__cameraDemo.camera.distance,
          }));
          assert.ok(state.position.every(Number.isFinite));
          modes.push(state);
          if (mode !== "orbit")
            await page.screenshot({
              path: path.join(out, `${place}-${width}-${mode}.png`),
            });
        }
        if (place === "plaza") {
          assert.notDeepEqual(
            modes[0].position,
            modes[1].position,
            "1a and 1b differ",
          );
          assert.notDeepEqual(
            modes[0].position,
            modes[2].position,
            "1c is implemented",
          );
          await page.selectOption("#camera", "1a");
          await frame.waitForFunction(
            () => globalThis.__cameraDemo.camera.mode === "1a",
          );
          const before = await frame.evaluate(() =>
            globalThis.__game.player.root.position.toArray(),
          );
          await frame.locator("#c").focus();
          await page.keyboard.down("d");
          await page.waitForTimeout(650);
          await page.keyboard.up("d");
          const after = await frame.evaluate(() =>
            globalThis.__game.player.root.position.toArray(),
          );
          assert.ok(
            Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.15,
            "keyboard walking moves the real body",
          );
          await page.selectOption("#camera", "orbit");
          await frame.waitForFunction(
            () => globalThis.__cameraDemo.camera.mode === "orbit",
          );
          const rect = await page.locator("#world").boundingBox();
          const yaw = await frame.evaluate(
            () => globalThis.__cameraDemo.camera.yaw,
          );
          await page.mouse.move(rect.x + 230, rect.y + 220);
          await page.mouse.down({ button: "right" });
          await page.mouse.move(rect.x + 290, rect.y + 240, { steps: 5 });
          await page.mouse.up({ button: "right" });
          assert.ok(
            Math.abs(
              (await frame.evaluate(() => globalThis.__cameraDemo.camera.yaw)) -
                yaw,
            ) > 0.2,
            "right drag orbits",
          );
          await page.click("#reset");
          await page.waitForTimeout(100);
          if (width < 600) {
            // Real pointer capture on the thumb stick, including release outside its starting point.
            const stick = await frame.locator(".demo-stick").boundingBox();
            const start = await frame.evaluate(() =>
              globalThis.__game.player.root.position.toArray(),
            );
            await page.mouse.move(stick.x + 52, stick.y + 52);
            await page.mouse.down();
            await page.mouse.move(stick.x + 85, stick.y + 52);
            await page.waitForTimeout(600);
            await page.mouse.up();
            const end = await frame.evaluate(() =>
              globalThis.__game.player.root.position.toArray(),
            );
            assert.ok(
              Math.hypot(end[0] - start[0], end[2] - start[2]) > 0.1,
              "thumb stick walks",
            );
            assert.equal(
              await frame.evaluate(() => globalThis.__game.walker.keys.size),
              0,
              "thumb stick releases its keys",
            );
            await page.selectOption("#touch", "2c");
            await frame.waitForFunction(
              () => globalThis.__cameraDemo.controls.mode === "2c",
            );
            const strip = await frame.locator(".demo-strip").boundingBox();
            const old = await frame.evaluate(
              () => globalThis.__cameraDemo.camera.yaw,
            );
            await page.mouse.move(strip.x + 30, strip.y + 20);
            await page.mouse.down();
            await page.mouse.move(strip.x + 90, strip.y + 20, { steps: 4 });
            await page.mouse.up();
            assert.ok(
              Math.abs(
                (await frame.evaluate(
                  () => globalThis.__cameraDemo.camera.yaw,
                )) - old,
              ) > 0.2,
              "look strip rotates",
            );
            await page.selectOption("#touch", "2a");
            await frame.waitForFunction(
              () => globalThis.__cameraDemo.controls.mode === "2a",
            );
            const cdp = await context.newCDPSession(page);
            const points = [
              { x: 230, y: rect.y + 330 },
              { x: 310, y: rect.y + 330 },
            ];
            const oldYaw = await frame.evaluate(
              () => globalThis.__cameraDemo.camera.yaw,
            );
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: points,
            });
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: points.map((p) => ({ x: p.x - 50, y: p.y })),
            });
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchEnd",
              touchPoints: [],
            });
            assert.ok(
              Math.abs(
                (await frame.evaluate(
                  () => globalThis.__cameraDemo.camera.yaw,
                )) - oldYaw,
              ) > 0.2,
              "two fingers rotate",
            );
            await page.selectOption("#touch", "2b");
            await frame.waitForFunction(
              () => globalThis.__cameraDemo.controls.mode === "2b",
            );
            const thumbs = [
              { x: stick.x + 85, y: stick.y + 52, id: 1 },
              { x: 290, y: rect.y + 260, id: 2 },
            ];
            const readPose = () => ({
              position: globalThis.__game.player.root.position.toArray(),
              yaw: globalThis.__cameraDemo.camera.yaw,
            });
            const beforeThumbs = await frame.evaluate(readPose);
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: thumbs,
            });
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [thumbs[0], { ...thumbs[1], x: 340 }],
            });
            await page.waitForTimeout(600);
            const duringThumbs = await frame.evaluate(readPose);
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchEnd",
              touchPoints: [],
            });
            assert.ok(
              Math.hypot(
                duringThumbs.position[0] - beforeThumbs.position[0],
                duringThumbs.position[2] - beforeThumbs.position[2],
              ) > 0.1,
              "walking continues while the other thumb looks",
            );
            assert.ok(
              Math.abs(duringThumbs.yaw - beforeThumbs.yaw) > 0.2,
              "looking works while the other thumb walks",
            );
            assert.equal(
              await frame.evaluate(() => globalThis.__game.walker.keys.size),
              0,
              "both thumbs released",
            );
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: [thumbs[0]],
            });
            await frame.evaluate(() =>
              globalThis.dispatchEvent(new globalThis.Event("blur")),
            );
            assert.equal(
              await frame.evaluate(() => globalThis.__game.walker.keys.size),
              0,
              "blur clears touch movement",
            );
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchEnd",
              touchPoints: [],
            });
            await cdp.detach();
          }
        }
        results.push({ width, height, place, modes });
        assert.deepEqual(
          await page.evaluate(() => ({
            local: { ...globalThis.localStorage },
            session: { ...globalThis.sessionStorage },
          })),
          sentinel,
          "host saves and settings are unchanged",
        );
        console.log("PASS", width, place);
      }
      assert.deepEqual(privateRequests, [], "no private content requests");
      assert.deepEqual(errors, [], "no page errors");
      await context.close();
    }
  },
  { timeoutMs: 285000 },
);
fs.writeFileSync(
  path.join(out, "results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  `PASS camera demo: ${results.length} place/viewport cases, storage isolation and controls`,
);
