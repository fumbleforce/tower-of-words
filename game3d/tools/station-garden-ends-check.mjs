// Public evidence and physical walking checks for the station garden's two ends.
import assert from "node:assert/strict";
import fs from "node:fs";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { scopedRoute } from "../../tools/bible/check-scope.mjs";
import { sampleFrames } from "./perf/place-measure.mjs";
import { waitForGame } from "../test/support/wait-ready.mjs";
const base = process.env.BASE || "game3d";
const out =
  process.env.OUT ||
  new URL("../shots/island-day1/forecourt-dead-ends/after/", import.meta.url)
    .pathname;
const before = process.env.BEFORE === "1";
const captureOnly = process.env.CAPTURE_ONLY === "1";
fs.mkdirSync(out, { recursive: true });
const errors = [],
  rows = [],
  walks = [];
await withBrowserJob(
  "station-garden-ends",
  async (browser) => {
    for (const width of [1366, 390]) {
      const phone = width < 600;
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 860 },
        isMobile: phone,
        hasTouch: phone,
      });
      let closing = false;
      await context.route(
        "**/*",
        scopedRoute({
          publicOnly: true,
          isClosing: () => closing,
          onFailure: (e) => errors.push(String(e)),
        }),
      );
      await context.addInitScript(
        (mode) =>
          globalThis.localStorage.setItem(
            "amakawa-settings",
            JSON.stringify({
              privateMode: false,
              voiceOn: false,
              cameraMode: mode,
            }),
          ),
        phone ? "overview" : "follow",
      );
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await waitForGame(
          page,
          120000,
          () =>
            page.goto(
              `http://127.0.0.1:8771/${base}/index.html?day=3&place=shotengai&q=${phone ? 0 : 2}`,
            ),
          "play",
        );
        await page.waitForFunction(
          () => globalThis.__done && !globalThis.__game.busy,
        );
        await page.evaluate(() => {
          const g = globalThis.__game;
          g.player.root.position.set(-3.55, 0, -78.95);
          g.walker.sync();
          g.place.cam.snap(g.player.root.position);
          g.place.stationGarden.routine.restore({
            patch: 0,
            phase: "sweep",
            time: 0,
          });
          g.place.stationGarden.routine.pause();
        });
        for (const period of ["morning", "evening"]) {
          await page.evaluate(
            (to) => globalThis.__game.hooks.period({ to }),
            period,
          );
          for (const [name, point, yaw] of [
            ["west-end", [-3.55, -80.8], Math.PI],
            ["station-end", [-1.1, -78.95], Math.PI / 2],
            ["entry", [-5.1, -77.2], Math.PI],
            ["feedback", [-5.11, -78.76], 2.8],
          ]) {
            await page.evaluate(
              ({ point, yaw, phone }) => {
                const g = globalThis.__game;
                g.player.root.position.set(point[0], 0, point[1]);
                g.walker.sync();
                g.place.cam.snap(g.player.root.position);
                if (!phone) g.followCamera.aim(yaw, -0.12);
              },
              { point, yaw, phone },
            );
            await page.waitForTimeout(900);
            const frame = await page.evaluate(sampleFrames, 5);
            const file = `${width}-${period}-${name}.png`;
            await page.screenshot({ path: `${out}/${file}` });
            rows.push(
              await page.evaluate(
                ({ file, frame }) => ({
                  file,
                  position: globalThis.__game.player.root.position.toArray(),
                  triangles: frame.tris,
                  calls: frame.calls,
                }),
                { file, frame },
              ),
            );
          }
        }
        if (!before && !captureOnly) {
          const result = await page.evaluate(async () => {
            const g = globalThis.__game;
            const { local, PATHS, COVERED } =
              await import("./js/scenes/station-garden/plan.js");
            const { PATHS: mapPaths } =
              await import("./js/scenes/island-layout.js");
            const covered = COVERED.map(([x0, z0, x1, z1]) =>
              local([(x0 + x1) / 2, (z0 + z1) / 2]),
            );
            const forbidden = [
              [-21, 23.5],
              [-14.45, 18.5],
              [-14.45, 12],
            ].map(local);
            const route = [
              [-6, 24.5],
              [-11.2, 24.5],
              [-14.45, 24],
              [-16.55, 23.7],
              [-14.45, 23],
              [-14.45, 20.8],
              [-14.45, 23],
              [-14.45, 25.9],
              [-11.2, 25.9],
              [-11.2, 24.5],
              [-6, 24.5],
            ].map(local);
            g.player.root.position.set(...[route[0][0], 0, route[0][1]]);
            g.walker.sync();
            g.place.stationGarden.routine.resume();
            const reached = [];
            for (const target of route) {
              await g.walkTo(...target);
              let end = g.player.root.position;
              let error = Math.hypot(end.x - target[0], end.z - target[1]);
              // Let an ambient pedestrian pass before retapping an occupied floor point.
              for (let retry = 0; error > 0.35 && retry < 24; retry++) {
                await new Promise((resolve) =>
                  globalThis.setTimeout(resolve, 500),
                );
                await g.walkTo(...target);
                end = g.player.root.position;
                error = Math.hypot(end.x - target[0], end.z - target[1]);
              }
              reached.push({ target, error, end: [end.x, end.z] });
            }
            return {
              reached,
              forbidden: [...forbidden, ...covered].map((p) => ({
                point: p,
                free: g.place.nav.free(...p),
              })),
              mapHasSpur: mapPaths.some((p) => p.id === "coast_south_walk"),
              pathCount: PATHS.length,
              privateMode: globalThis.__settings.privateMode,
            };
          });
          result.reached.forEach((r) =>
            assert.ok(r.error < 0.35, `arrival ${r.target}: ${r.error}`),
          );
          result.forbidden.forEach((r) =>
            assert.equal(r.free, false, `closed garden boundary ${r.point}`),
          );
          assert.equal(result.mapHasSpur, false);
          assert.equal(result.privateMode, false);
          walks.push({ width, ...result });
        }
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 300000, gpuWaitMs: 900000 },
);
fs.writeFileSync(
  `${out}/report.json`,
  JSON.stringify({ before, captureOnly, rows, walks, errors }, null, 2),
);
assert.deepEqual(errors, []);
console.log(
  `PASS ${rows.length} garden views and ${walks.length} physical routes: ${out}`,
);
