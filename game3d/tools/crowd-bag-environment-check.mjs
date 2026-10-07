// Compare GTAO depth thickness in native environment views; public content only.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { scopedRoute } from "../../tools/bible/check-scope.mjs";
import { waitForGame } from "../test/support/wait-ready.mjs";
const base = process.env.BASE || "game3d";
const thickness = Number(process.env.AO_THICKNESS || 0.5);
assert.ok(Number.isFinite(thickness) && thickness > 0);
const out =
  process.env.OUT || `game3d/shots/crowd-bags/environment-${thickness}`;
fs.mkdirSync(`${out}/sources`, { recursive: true });
const source = fs
  .readFileSync(new URL("../js/post.js", import.meta.url), "utf8")
  .replace(/thickness: [\d.]+,/, `thickness: ${thickness},`);
fs.writeFileSync(`${out}/sources/post.js`, source);
const report = {
  thickness,
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  quality: 2,
  frames: [],
  errors: [],
};
await withBrowserJob(
  "bag-environment",
  async (browser) => {
    try {
      for (const [width, height] of [
        [2560, 1440],
        [390, 844],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height },
        });
        let closing = false;
        await context.route(
          "**/*",
          scopedRoute({
            publicOnly: true,
            isClosing: () => closing,
            onFailure: (e) => report.errors.push(e),
          }),
        );
        await context.route("**/js/post.js*", (route) =>
          route.fulfill({ contentType: "text/javascript", body: source }),
        );
        await context.addInitScript(() =>
          globalThis.localStorage.setItem(
            "amakawa-settings",
            JSON.stringify({
              v: 2,
              privateMode: false,
              voiceOn: false,
              textSpeed: "instant",
            }),
          ),
        );
        for (const [id, place, spot] of [
          ["b2", "office", "mio_by_desk"],
          ["lobby", "forecourt", "lobby_island_w"],
          ["greenery", "plaza", null],
          ["seating", "plaza", "bench"],
        ]) {
          if (process.env.VIEWS && !process.env.VIEWS.split(",").includes(id))
            continue;
          const page = await context.newPage();
          page.on("pageerror", (e) => report.errors.push(e.message));
          await waitForGame(
            page,
            90000,
            () =>
              page.goto(
                `http://127.0.0.1:8771/${base}/index.html?day=2&place=${place}&cap&q=2&charscale=85`,
              ),
            "play",
          );
          await page.waitForFunction(() => !globalThis.__game.busy);
          const setup = await page.evaluate(async (spot) => {
            const g = globalThis.__game,
              T = await import("three");
            let at = spot && g.place.spots[spot];
            if (spot === "bench") {
              g.place.space.updateMatrixWorld(true);
              g.place.space.traverse((o) => {
                if (at || !o.userData.seats?.length) return;
                const s = o.userData.seats[0];
                const p = g.place.space.worldToLocal(
                  new T.Vector3(s.x, 0.34, s.z).applyMatrix4(o.matrixWorld),
                );
                at = [p.x, p.z + 0.8];
              });
            }
            if (at) g.player.root.position.set(at[0] ?? at.x, 0, at[1] ?? at.z);
            g.walker.stop();
            g.walker.sync();
            for (let i = 0; i < 60; i++) g.place.update?.(1 / 30, g.t);
            g.place.cam?.snap(g.player.root.position);
            for (const r of g.place.crowd || []) r.root.visible = false;
            return {
              position: g.player.root.position.toArray(),
              spot,
              found: !!at,
            };
          }, spot);
          await page.waitForTimeout(600);
          await page.evaluate(() => {
            globalThis.__game.paused = true;
            globalThis.__run = false;
          });
          const file = `${id}-${width}.png`;
          await page.screenshot({ path: `${out}/${file}` });
          report.frames.push({ file, width, height, ...setup });
          await page.close();
        }
        closing = true;
        await context.close();
      }
      assert.equal(report.errors.length, 0, report.errors.join("\n"));
      report.passed = true;
    } finally {
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
    }
  },
  { timeoutMs: 285000 },
);
console.log(
  JSON.stringify({ frames: report.frames.length, errors: report.errors }),
);
