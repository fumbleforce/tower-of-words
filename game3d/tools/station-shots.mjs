// Pictures of Honsha station and its platform shed (scenes/station-exterior.js, station-shed.js, the Blender model
// tools/station/station.py) at the forecourt, desktop and phone: the play camera with Eric at the station door and
// out on the court, the follow camera beside it, and free views round it (low, eye height, walking round it; from the
// sea; from behind; from above). Serves the tree this file is in.
//   node game3d/tools/station-shots.mjs <outdir> [view ...]     SIZES=1366x860,390x844
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { ensureBuild } from "../../tools/lib/build-stamp.mjs";
import { serveFolder } from "../../tools/lib/static-server.mjs";

const [out, ...only] = process.argv.slice(2);
if (!out) throw new Error("usage: station-shots.mjs <outdir> [view ...]");
fs.mkdirSync(out, { recursive: true });
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
ensureBuild();
const server = await serveFolder(root);
const sizes = (process.env.SIZES || "1366x860,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));
const AWAY = [24, 2]; // where Eric stands for the free views, clear of the station's fade
// at: Eric; cam: [x, y, z] and look: [x, y, z] for a free camera (the play camera otherwise); follow: [yaw, pitch]
const VIEWS = [
  { id: "play-door", at: [-1.5, 1.15] },
  { id: "play-court", at: [9, 0.2] },
  { id: "follow-court", at: [-4.5, 0.6], follow: [Math.PI * 0.8, -0.35] },
  { id: "follow-shed", at: [-5.6, -3], follow: [Math.PI * 0.5, -0.3] },
  { id: "low-court-nw", cam: [-9, 1.7, -2.5], look: [-1, 2.2, 6] },
  { id: "low-north", cam: [1, 1.7, -4], look: [-1, 2, 6] },
  { id: "low-east", cam: [12, 1.7, 7], look: [0, 2, 7] },
  { id: "low-south-east", cam: [10, 1.7, 21], look: [-2, 2.2, 8] },
  { id: "low-south", cam: [-3, 1.7, 26], look: [-5, 2.5, 8] },
  { id: "low-south-west", cam: [-20, 1.7, 24], look: [-10, 2.6, 6] },
  { id: "low-west", cam: [-26, 2.4, 6], look: [-10, 2.8, 4] },
  { id: "low-shed-north", cam: [-20, 1.9, -30], look: [-14, 3, -12] },
  { id: "platform-east", cam: [-11.6, 3.7, -16], look: [-14.6, 3.1, 4] },
  { id: "platform-west", cam: [-17.6, 3.7, 12], look: [-14.6, 3.1, -8] },
  { id: "roof-top", cam: [-0.5, 9, 1], look: [-0.5, 3.8, 7] },
  { id: "stairs", cam: [-8.5, 1.8, 20], look: [-12.5, 1.2, 14] },
  // standing on the platforms (eye height over the deck), on the stairs and in the walkway
  { id: "plat-east-north", cam: [-11.6, 4.1, 9], look: [-13.6, 3.7, -20] },
  { id: "plat-east-south", cam: [-11.6, 4.1, -19], look: [-13, 3.4, 12] },
  { id: "plat-west-north", cam: [-17.6, 4.1, 9], look: [-15.6, 3.7, -20] },
  { id: "plat-east-across", cam: [-11.2, 4.1, -2], look: [-18.5, 3.6, -4] },
  { id: "plat-west-across", cam: [-18, 4.1, -2], look: [-10.5, 3.4, -4] },
  { id: "plat-up", cam: [-12, 3.9, 0], look: [-14.6, 6.2, 3] },
  { id: "gable-in", cam: [-12, 4.1, -13], look: [-15, 3.9, -24] },
  { id: "gable-out", cam: [-13, 1.7, -37], look: [-14.6, 3.4, -22] },
  { id: "roof-close", cam: [-6.5, 7.4, -9], look: [-14.6, 4.8, -4] },
  { id: "stairs-top", cam: [-11.9, 4.1, 8.5], look: [-11.9, 1.6, 15.5] },
  { id: "stairs-foot", cam: [-11.6, 1.6, 17.4], look: [-12, 3, 10] },
  { id: "walk-east", cam: [-13, 1.6, 17.25], look: [0, 1.3, 17.25] },
  { id: "walk-north", cam: [-0.5, 1.6, 17.6], look: [-0.5, 1.6, 11] },
  { id: "walk-west", cam: [-6, 1.6, 17.25], look: [-20, 1.5, 17.25] },
  { id: "stairs-side", cam: [-8.6, 1.7, 12.5], look: [-12, 1.4, 13.2] },
  { id: "walk-out", cam: [-6, 1.7, 24], look: [-7, 1.6, 16] },
  { id: "sea", cam: [-48, 9, 4], look: [-10, 2.5, 0] },
  { id: "behind", cam: [-6, 9, 38], look: [-8, 2.5, 6] },
  { id: "above-sw", cam: [-34, 22, 32], look: [-8, 1.5, 2] },
  { id: "above-ne", cam: [12, 20, -22], look: [-8, 1.5, 4] },
].filter((v) => !only.length || only.includes(v.id));
const errors = [];
try {
  await withBrowserJob(
    "station-shots",
    async (browser) => {
      for (const [w, h] of sizes) {
        const phone = w < 700;
        for (const follow of [false, true]) {
          const views = VIEWS.filter((v) => !!v.follow === follow);
          if (!views.length) continue;
          const context = await browser.newContext({
            viewport: { width: w, height: h },
            isMobile: phone,
            hasTouch: phone,
          });
          const page = await context.newPage();
          page.on("pageerror", (e) => errors.push(e.message));
          await page.addInitScript(
            (mode) => {
              globalThis.localStorage.setItem(
                "amakawa-settings",
                JSON.stringify({
                  v: 99,
                  privateMode: false,
                  voiceOn: false,
                  cameraMode: mode,
                  textSpeed: "instant",
                }),
              );
            },
            follow ? "follow" : "overview",
          );
          await page.goto(
            `${server.url}/game3d/index.html?place=forecourt&day=2&mc=eric&q=${phone ? 1 : 2}`,
          );
          await page.waitForFunction(() => globalThis.__done, null, {
            timeout: 120000,
          });
          await page.waitForFunction(
            () => globalThis.__game?.place && !globalThis.__game.busy,
            null,
            { timeout: 60000 },
          );
          await page.waitForFunction(
            () =>
              !globalThis.document.getElementById("boot") ||
              globalThis.document
                .getElementById("boot")
                .classList.contains("gone"),
          );
          await page.waitForTimeout(1500);
          for (const v of views) {
            await page.evaluate(
              ([v, away]) => {
                const g = globalThis.__game,
                  P = g.place,
                  cam = P.cam,
                  p = (g.walker?.body || g.player.root).position;
                g.walker?.stop?.();
                if (globalThis.__stationCamUpdate)
                  cam.update = globalThis.__stationCamUpdate;
                const at = v.at || away;
                p.set(at[0], p.y, at[1]);
                cam.snap?.(p);
                if (v.follow) g.followCamera.aim(v.follow[0], v.follow[1]);
                if (v.cam) {
                  globalThis.__stationCamUpdate = cam.update;
                  cam.update = () => {
                    const c = cam.camera;
                    c.fov = 50;
                    c.far = 600;
                    c.updateProjectionMatrix();
                    c.position.set(...v.cam);
                    c.lookAt(...v.look);
                    c.updateMatrixWorld();
                  };
                }
              },
              [v, AWAY],
            );
            await page.waitForTimeout(1300);
            const file = `${v.id}-${phone ? "phone" : "desk"}.png`;
            await page.screenshot({ path: path.join(out, file) });
            console.log(file);
          }
          await context.close();
        }
      }
    },
    { timeoutMs: 15 * 60e3, gpuWaitMs: 10 * 60e3 },
  );
} finally {
  server.close();
}
if (errors.length) console.log("ERRORS\n" + [...new Set(errors)].join("\n"));
