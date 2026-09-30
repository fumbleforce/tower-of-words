// Checks Eric's short story gestures (hooks/rig-gestures.js meshyShort): `{ do: 'gesture', who: 'eric', kind }` for
// nod, bow, shrug and wave each returns within about a second, and stills at the top of each move, whole screen and a
// close-up on him, from the play camera in the dorm courtyard and on the train.
//   node game3d/tools/eric-gesture-check.mjs <outdir>
// SIZES=1366x860,390x844 (default). BASE=.claude/worktrees/<name>/game3d for a worktree.
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] || "game3d/shots/eric-gesture-check";
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || "game3d";
const sizes = (process.env.SIZES || "1366x860,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));
const KINDS = { nod: 0.9, bow: 1.0, shrug: 0.9, wave: 1.0 }; // the move's length; the hook may take a frame more
const PEAK = { nod: 0.2, bow: 0.5, shrug: 0.5, wave: 0.35 }; // where in it to take the still
const fails = [],
  errors = [],
  notes = [];
await withBrowserJob("eric-gesture-check", async (browser) => {
  for (const [W, H] of sizes) {
    const phone = W < 700,
      tag = `${W}x${H}`;
    for (const place of ["dorm_court", "train"]) {
      const context = await browser.newContext({
        viewport: { width: W, height: H },
        isMobile: phone,
        hasTouch: phone,
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${tag} ${place}: ${e.message}`));
      await page.goto(
        `http://127.0.0.1:8771/${base}/index.html?q=1&place=${place}&skip`,
        { timeout: 60000 },
      );
      await page.waitForFunction(() => globalThis.__done, null, {
        timeout: 120000,
      });
      if (await page.isVisible("#title .go")) await page.click("#title .go");
      await page.waitForTimeout(1500);
      for (const [kind, len] of Object.entries(KINDS)) {
        await page.evaluate((kind) => {
          const g = globalThis.__game;
          globalThis.__t = [performance.now()];
          g.hooks
            .gesture({ who: "eric", kind })
            .then(() => globalThis.__t.push(performance.now()));
        }, kind);
        await page.waitForTimeout(len * PEAK[kind] * 1000);
        const box = await page.evaluate(() => {
          const g = globalThis.__game,
            r = g.player,
            cam = g.place.cam?.camera;
          if (!cam) return null;
          const v = r.root.getWorldPosition(r.root.position.clone());
          v.y += 0.6;
          v.project(cam);
          return {
            x: ((v.x + 1) / 2) * globalThis.innerWidth,
            y: ((1 - v.y) / 2) * globalThis.innerHeight,
          };
        });
        await page.screenshot({
          path: path.join(out, `${place}-${kind}-${tag}.png`),
        });
        if (box) {
          const s = phone ? 200 : 260,
            x = Math.max(0, Math.min(W - s, box.x - s / 2)),
            y = Math.max(0, Math.min(H - s, box.y - s / 2));
          await page.screenshot({
            path: path.join(out, `${place}-${kind}-${tag}-close.png`),
            clip: { x, y, width: s, height: s },
          });
        }
        await page
          .waitForFunction(() => globalThis.__t.length === 2, null, {
            timeout: 20000,
          })
          .catch(() => null);
        const ms = await page.evaluate(() =>
          globalThis.__t.length === 2
            ? globalThis.__t[1] - globalThis.__t[0]
            : null,
        );
        if (ms == null || ms > len * 1000 + 400)
          fails.push(
            `FAIL ${tag} ${place}: ${kind} took ${ms == null ? "> 20 s" : Math.round(ms) + " ms"}`,
          );
        else
          notes.push(
            `${tag} ${place}: ${kind} returned in ${Math.round(ms)} ms`,
          );
        await page.waitForTimeout(300);
      }
      await context.close();
    }
  }
});
for (const n of notes) console.log(n);
for (const e of errors) console.log("ERROR", e);
for (const f of fails) console.log(f);
console.log(
  fails.length || errors.length ? "FAIL" : "PASS",
  `stills in ${out}`,
);
process.exit(fails.length || errors.length ? 1 : 0);
