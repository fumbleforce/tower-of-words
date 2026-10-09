// Staging: native forecourt overview, looking across the paving toward station/office glazing.
// Compare the same daytime/evening positions at near, far and oblique angles. Native A/D
// movement carries the overview past the office panes; existing sky reflections should slide
// coherently while the recessed interior/blinds stay attached. No camera/material overrides.
import fs from "node:fs";
import assert from "node:assert/strict";
import { withNativeBrowser } from "../../reviews/camera-plan-1/native-browser.mjs";
import { scopedRoute } from "../../tools/bible/check-scope.mjs";
import { waitForGame } from "../test/support/wait-ready.mjs";
const width = +(process.argv[2] || 1366),
  height = +(process.env.HEIGHT || (width < 600 ? 844 : 860));
const base = process.env.BASE || "game3d";
const out =
  process.env.OUT ||
  new URL(`../shots/window-glass/${Date.now()}-${width}`, import.meta.url)
    .pathname;
fs.mkdirSync(out, { recursive: true });
const report = { width, height, frames: [], errors: [] };
await withNativeBrowser("window-glass-" + width, async (browser, native) => {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 600,
    hasTouch: width < 600,
  });
  const page = await context.newPage();
  let closing = false;
  await context.route(
    "**/*",
    scopedRoute({
      publicOnly: true,
      isClosing: () => closing,
      onFailure: (e) => report.errors.push(e),
    }),
  );
  await context.addInitScript(() =>
    globalThis.localStorage.setItem(
      "amakawa-settings",
      JSON.stringify({
        v: 99,
        privateMode: false,
        voiceOn: false,
        textSpeed: "instant",
        cameraMode: "overview",
      }),
    ),
  );
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  const shot = async (name, point) => {
    if (point)
      await page.evaluate((p) => globalThis.__game.walkTo(...p), point);
    await page.waitForTimeout(450);
    const state = await page.evaluate((name) => {
      const g = globalThis.__game;
      return {
        name,
        place: g.place.name,
        position: g.player.root.position.toArray(),
        camera: g.place.camera.position.toArray(),
        rotation: g.place.camera.quaternion.toArray(),
        fov: g.place.camera.fov,
      };
    }, name);
    assert.equal(state.place, "forecourt");
    if (point)
      assert.ok(
        Math.hypot(state.position[0] - point[0], state.position[2] - point[1]) <
          0.2,
        `${name} reaches target: ${state.position}`,
      );
    report.frames.push(state);
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  try {
    await waitForGame(
      page,
      90000,
      () =>
        page.goto(
          `http://127.0.0.1:8771/${base}/?day=2&place=forecourt&q=${width < 600 ? 1 : 2}&perf`,
        ),
      "play",
    );
    await page.waitForFunction(() => !globalThis.__game.busy);
    report.cached = await page.evaluate(async () => {
      const { mat } = await import("./js/props.js");
      const m = mat("#8c9dad", { roughness: 0.45, metalness: 0.05 });
      return { color: m.color.getHexString(), map: !!m.map, env: !!m.envMap };
    });
    assert.deepEqual(report.cached, {
      color: "8c9dad",
      map: false,
      env: false,
    });
    for (const period of ["morning", "evening"]) {
      await page.evaluate(async (period) => {
        const g = globalThis.__game,
          { sim } = await import("./js/sim.js");
        sim.period = period;
        g.place.onPeriod(period);
      }, period);
      await shot(`${period}-station-near`, [6.4, 9.5]);
      await shot(`${period}-station-far`, [9.7, 10.65]);
      await shot(`${period}-office-near`, [18.5, 1.5]);
      await shot(`${period}-office-oblique`, [17, 2.15]);
      if (width >= 700 && width <= 1600) {
        // Focus the real canvas, then use physical keys; the overview follows the moving player.
        await native.clickElement(page, page.locator("canvas").first());
        const before = await page.evaluate(
          () => globalThis.__game.player.root.position.x,
        );
        native.down("d");
        try {
          await page.waitForTimeout(420);
        } finally {
          native.up("d");
        }
        await shot(`${period}-office-native-right`);
        const after = report.frames.at(-1).position[0];
        assert.ok(after > before + 0.1, "native D moves beside glazing");
      }
    }
    await page.evaluate(async () => {
      const g = globalThis.__game;
      await g.walkTo(...g.place.spots.lift_front);
    });
    await shot("lift-cutaway");
    report.panes = await page.evaluate(() => {
      const g = globalThis.__game,
        panes = [];
      g.place.space.traverse((o) => {
        if (o.isMesh && /^(ho:.*[Gg]lass|station:glass)/.test(o.name))
          panes.push({
            name: o.name,
            color: o.material.color.getHexString(),
            emission: o.material.emissiveIntensity,
            map: !!o.material.map,
            emissiveMap: !!o.material.emissiveMap,
            env: !!o.material.envMap,
          });
      });
      return panes;
    });
    assert.ok(
      report.panes.length >= 3 &&
        report.panes.every((p) => p.map && p.emissiveMap && p.env),
    );
    report.performance = await page.evaluate(() => globalThis.__perfReport());
    assert.deepEqual(report.errors, []);
    report.pass = true;
  } catch (e) {
    report.failure = e.stack;
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    throw e;
  } finally {
    closing = true;
    await context.close();
    fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  }
});
console.log("PASS window-glass native views", out);
