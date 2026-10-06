// BASE may point at a served worktree. GL=soft runs functional checks without a GPU slot.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";

const base = process.env.BASE || "http://127.0.0.1:8771/";
const out = process.env.OUT || "game3d/shots/camera-response";
fs.mkdirSync(out, { recursive: true });
const results = [];
const pose = () => {
  const g = globalThis.__game,
    c = globalThis.__cameraDemo.camera;
  return {
    p: g.player.root.position.toArray(),
    yaw: c.yaw,
    facing: g.player.root.rotation.y,
    camera: g.place.camera.position.toArray(),
    basis: g.walker.keyFrame?.toArray(),
    scene: c.scene,
    keys: g.walker.keys.size,
    path: !!g.walker.path,
  };
};
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
await withBrowserJob(
  "camera-response-check",
  async (browser) => {
    for (const [width, height] of [
      [1366, 860],
      [390, 844],
    ]) {
      const mobile = width < 600;
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: mobile,
        isMobile: mobile,
      });
      const page = await context.newPage();
      const errors = [],
        privateRequests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/*", (route) => {
        if (new URL(route.request().url()).pathname.includes("/private/")) {
          privateRequests.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(new URL("reviews/camera-plan-1/demo.css", base).href);
      const sentinel = await page.evaluate(() => {
        globalThis.localStorage.setItem(
          "amakawa-save",
          '{"day":5,"sentinel":"keep"}',
        );
        globalThis.localStorage.setItem(
          "amakawa-settings",
          '{"v":2,"privateMode":true,"master":0.37}',
        );
        globalThis.sessionStorage.setItem("camera-demo-sentinel", "keep");
        return {
          local: { ...globalThis.localStorage },
          session: { ...globalThis.sessionStorage },
        };
      });
      for (const place of process.env.QUICK
        ? ["office"]
        : ["plaza", "office", "dorms", "train"]) {
        const url = new URL("reviews/camera-plan-1/demo.html", base);
        url.search = new URLSearchParams({ place, camera: "1c" });
        await page.goto(url.href);
        await page.waitForFunction(
          () => globalThis.document.querySelector("#status").hidden,
          null,
          { timeout: 90000 },
        );
        const frame = page
          .frames()
          .find((f) => f.url().includes("/frame.html"));
        assert.ok(frame);
        assert.deepEqual(
          await frame.evaluate(() => ({
            private: globalThis.__settings.privateMode,
            saving: globalThis.__game.saveEnabled,
            idb: typeof indexedDB,
          })),
          { private: false, saving: false, idb: "undefined" },
        );
        assert.equal(
          await page.locator("#touch").count(),
          0,
          "phone third-person controls removed",
        );
        if (mobile) {
          assert.equal(
            await frame.evaluate(() => globalThis.__cameraDemo.camera.mode),
            "overview",
          );
          assert.ok(await page.locator("#camera").isDisabled());
          assert.ok(await page.locator("#mobile-note").isVisible());
          assert.ok(await page.locator("#scene").isHidden());
          // Even a direct message cannot switch a touch frame into third person.
          await page.evaluate(() =>
            globalThis.document
              .querySelector("#world")
              .contentWindow.postMessage(
                { cameraDemo: true, name: "camera", value: "1c" },
                globalThis.location.origin,
              ),
          );
          await page.waitForTimeout(100);
          assert.equal(
            await frame.evaluate(() => globalThis.__cameraDemo.camera.mode),
            "overview",
          );
        } else {
          assert.equal(
            await frame.evaluate(() => globalThis.__cameraDemo.camera.mode),
            "1c",
          );
          const view = await frame.evaluate(pose);
          await frame.locator("#c").click({ position: { x: 300, y: 200 } });
          await page.waitForTimeout(250);
          assert.ok(
            distance((await frame.evaluate(pose)).p, view.p) < 0.02,
            "click only focuses",
          );
          if (place === "plaza") {
            // Change direction without releasing every key, then keep walking longer
            // than the old automatic camera return. Input basis must never turn itself.
            await page.keyboard.down("w");
            await page.waitForTimeout(500);
            await page.keyboard.down("d");
            await page.keyboard.up("w");
            await page.waitForTimeout(700);
            const right = await frame.evaluate(pose);
            assert.equal(
              right.yaw,
              view.yaw,
              "character turn cannot rotate camera",
            );
            assert.ok(distance(right.p, view.p) > 0.2, "real player moved");
            const rect = await page.locator("#world").boundingBox();
            await page.mouse.move(rect.x + 450, rect.y + 240);
            await page.mouse.down({ button: "right" });
            await page.mouse.move(rect.x + 560, rect.y + 240, { steps: 5 });
            await page.mouse.up({ button: "right" });
            await page.waitForTimeout(200);
            const looked = await frame.evaluate(pose);
            assert.ok(
              Math.abs(looked.yaw - right.yaw) > 0.5,
              "right drag is direct",
            );
            assert.ok(
              Math.abs(looked.basis[0] - Math.sin(looked.yaw)) < 0.001 &&
                Math.abs(looked.basis[2] - Math.cos(looked.yaw)) < 0.001,
              "held movement follows requested camera yaw immediately",
            );
            await page.waitForTimeout(2500);
            assert.equal(
              (await frame.evaluate(pose)).yaw,
              looked.yaw,
              "no delayed recenter",
            );
            await page.keyboard.up("d");
            await page.waitForTimeout(400);
            const stopped = await frame.evaluate(pose);
            await page.waitForTimeout(500);
            assert.ok(
              distance((await frame.evaluate(pose)).p, stopped.p) < 0.02,
              "no resumed old route",
            );
            await page.keyboard.down("w");
            await frame.evaluate(() =>
              globalThis.dispatchEvent(new globalThis.Event("blur")),
            );
            assert.equal(
              (await frame.evaluate(pose)).keys,
              0,
              "blur clears movement",
            );
            await page.keyboard.up("w");
          }
          await page.screenshot({
            path: path.join(out, `${place}-${width}-1c.png`),
          });
          const before = await frame.evaluate(pose);
          await page.click("#scene");
          await page.waitForTimeout(200);
          const scene = await frame.evaluate(pose);
          if (scene.scene) {
            assert.ok(
              (await page.locator("#scene").textContent()) ===
                "Return to walking",
            );
            await page.screenshot({
              path: path.join(out, `${place}-${width}-scene.png`),
            });
            await frame.locator("#c").focus();
            await page.keyboard.down("w");
            await page.waitForTimeout(300);
            await page.keyboard.up("w");
            assert.ok(
              distance((await frame.evaluate(pose)).p, scene.p) < 0.02,
              "scene pauses player",
            );
            await page.click("#scene");
            await page.waitForTimeout(150);
            const restored = await frame.evaluate(pose);
            assert.equal(
              restored.yaw,
              before.yaw,
              "scene exit preserves view direction",
            );
            assert.equal(restored.keys, 0);
            assert.equal(restored.path, false);
            assert.ok(
              Math.abs(restored.facing - before.facing) < 0.001,
              "scene does not turn player",
            );
          } else
            assert.match(
              await page.locator("#scene-note").textContent(),
              /No nearby pair/,
            );
          results.push({ width, place, view, scene });
        }
        if (mobile) {
          await page.screenshot({
            path: path.join(out, `${place}-${width}-overview.png`),
          });
          results.push({ width, place, mode: "overview" });
        }
        assert.deepEqual(
          await page.evaluate(() => ({
            local: { ...globalThis.localStorage },
            session: { ...globalThis.sessionStorage },
          })),
          sentinel,
        );
        console.log("PASS", width, place);
      }
      assert.deepEqual(privateRequests, []);
      assert.deepEqual(errors, []);
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
  `PASS ${results.length} viewport/place cases: controls, scenes, phone overview and isolation`,
);
