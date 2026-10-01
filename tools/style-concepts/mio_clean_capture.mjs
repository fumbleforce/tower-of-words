// Matched studio comparison: stationary 1.262 m model, grey background, same light and camera per pair.
// Front, her left three-quarter (image right in front view), her left side and back; then face at front and 40°.
// The original is left, candidate right. No assets or image pixels are modified.
import { withBrowserJob } from "../lib/browser-job.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const main = path.dirname(
  execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim(),
);
const root = path.join(main, "art/parts/style-concepts/claude-miogen3d/clean");
const attempts = process.argv.slice(2);
const errors = [],
  rows = [];
await withBrowserJob(
  "codex-mio-clean-capture",
  async (browser) => {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/tools/style-concepts/mio_clean_*", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").pop();
      await route.fulfill({
        path: path.join(here, name),
        contentType: name.endsWith(".html") ? "text/html" : "text/javascript",
      });
    });
    await page.goto(
      "http://127.0.0.1:8771/tools/style-concepts/mio_clean_viewer.html",
    );
    await page.waitForFunction(() => globalThis.__cleanReady, null, {
      timeout: 60000,
    });
    for (const id of attempts.length
      ? attempts
      : ["01-material", "02-eyes", "03-clean", "04-border", "05-safe"]) {
      const out = path.join(root, id, "renders");
      await fs.mkdir(out, { recursive: true });
      await page.selectOption("#attempt", id);
      await page.waitForFunction(() => globalThis.__cleanReady);
      for (const yaw of ["0", "40", "90", "180"]) {
        await page.click('[data-yaw="' + yaw + '"]');
        await page.screenshot({ path: path.join(out, "body-" + yaw + ".png") });
      }
      await page.click("#face");
      for (const yaw of ["0", "40", "90"]) {
        await page.click('[data-yaw="' + yaw + '"]');
        await page.screenshot({ path: path.join(out, "face-" + yaw + ".png") });
      }
      await page.click("#face");
      rows.push({ id, desktop: true });
    }
    await page.selectOption("#attempt", "05-safe");
    await page.waitForFunction(
      () => globalThis.__cleanReady && globalThis.__cleanShown === "05-safe",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-yaw="0"]');
    await page.screenshot({
      path: path.join(root, "05-safe/renders/phone-clean.png"),
    });
    await page.click("#side");
    await page.screenshot({
      path: path.join(root, "05-safe/renders/phone-original.png"),
    });
    rows.push({
      phone: true,
      originalToggle: await page.locator("#side").getAttribute("aria-pressed"),
    });
    await page.close();
  },
  { timeoutMs: 240000, loadWaitMs: 1000, gpuWaitMs: 1000 },
);
await fs.writeFile(
  path.join(root, "capture-results.json"),
  JSON.stringify({ rows, errors }, null, 2) + "\n",
);
console.log({ rows, errors });
if (errors.length) process.exitCode = 1;
