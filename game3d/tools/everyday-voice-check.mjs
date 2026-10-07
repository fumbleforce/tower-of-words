// Bounded authored-line activation/decode check. No listening-quality or scene-staging claim.
import assert from "node:assert/strict";
import fs from "node:fs";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { blockedSource } from "../../tools/bible/check-scope.mjs";
const scripts = {};
for (const id of ["mio", "emi", "guard", "kuro", "aoi", "rei"])
  scripts[id] = (await import(`../story/conversations/${id}.js`)).default;
const selected = [
  ["mio", "chat_mio_home_nice"],
  ["emi", "chat_emi_team"],
  ["guard", "chat_guard_hello"],
  ["kuro", "chat_kuro_name_again"],
  ["aoi", "chat_aoi_questions"],
  ["rei", "chat_rei_calls"],
].map(([id, node]) => ({
  node,
  line: scripts[id].nodes[node].find((s) => s.say === id),
}));
const address = scripts.kuro.nodes.chat_kuro_name[0];
assert.equal(address.text, "玖路さん。");
const base = process.env.BASE || "game3d",
  out = process.argv[2] || "game3d/shots/everyday-chat/voices";
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  "everyday-voices",
  async (browser) => {
    for (const [width, height, mc] of [
      [1366, 860, "eric"],
      [390, 844, "carina"],
    ]) {
      const report = {
        mc,
        width,
        scope:
          "Actual authored say nodes, native activation, requested/decoded/ended media; no listening-quality claim",
        records: [],
        errors: [],
        forbidden: [],
      };
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 600,
        hasTouch: width < 600,
      });
      await context.route("**/*", (route) => {
        if (blockedSource(route.request().url(), true)) {
          report.forbidden.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      await context.addInitScript(() => {
        globalThis.localStorage.setItem(
          "amakawa-settings",
          JSON.stringify({
            v: 2,
            privateMode: false,
            voiceOn: true,
            textSpeed: "instant",
            music: 0,
            ambience: 0,
            master: 0.7,
            voice: 0.8,
          }),
        );
        globalThis.__voiceCheck = [];
        const play = globalThis.HTMLMediaElement.prototype.play;
        globalThis.HTMLMediaElement.prototype.play = function (...args) {
          if (this.src.includes("/audio/")) {
            const record = {
              src: this.src,
              playing: false,
              ended: false,
              time: 0,
              duration: null,
              error: null,
            };
            globalThis.__voiceCheck.push(record);
            this.addEventListener(
              "playing",
              () => {
                record.playing = true;
                record.duration = this.duration;
              },
              { once: true },
            );
            this.addEventListener(
              "timeupdate",
              () => (record.time = this.currentTime),
            );
            this.addEventListener(
              "ended",
              () => {
                record.ended = true;
                record.time = this.currentTime;
              },
              { once: true },
            );
            this.addEventListener(
              "error",
              () => (record.error = this.error?.message),
              { once: true },
            );
          }
          return play.apply(this, args);
        };
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      page.on("response", (r) => {
        if (r.url().includes("/audio/") && r.status() >= 400)
          report.errors.push(`HTTP ${r.status()}: ${r.url()}`);
      });
      try {
        await page.goto(
          `http://127.0.0.1:${process.env.PORT || 8771}/${base}/index.html?day=2&place=office&mc=${mc}&q=0`,
        );
        await page.waitForFunction(
          () =>
            globalThis.__game?.place?.name === "office" &&
            !globalThis.__game.busy,
          null,
          { timeout: 65000 },
        );
        const lines = [
          ...(mc === "eric" ? selected : []),
          { node: "chat_kuro_name", line: address },
        ];
        const keys = await page.evaluate(async (lines) => {
          const { Runner } = await import("./js/runner.js"),
            { lineClip } = await import("./js/narrative/voice-keys.js"),
            g = globalThis.__game;
          const runner = new Runner(g);
          runner.use(g.place, {
            nodes: Object.fromEntries(
              lines.map(({ line }, i) => ["clip" + i, [line]]),
            ),
          });
          const button = globalThis.document.createElement("button");
          button.id = "voice-check";
          button.textContent = "Play authored line";
          Object.assign(button.style, {
            position: "fixed",
            left: "8px",
            top: "110px",
            zIndex: 10000,
          });
          globalThis.document.body.append(button);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            globalThis.__voiceDone = false;
            runner
              .run("clip" + button.dataset.index)
              .then(() => (globalThis.__voiceDone = true))
              .catch((e) => (globalThis.__voiceError = e.message));
          });
          return lines.map(
            ({ line }) =>
              line.voice || lineClip(line.say, line.text, !!line.overheard),
          );
        }, lines);
        assert.ok(keys.every(Boolean), "all exact authored clips registered");
        assert.equal(
          keys.at(-1),
          "ln-1yzrs49" + (mc === "carina" ? "-carina" : ""),
        );
        for (let i = 0; i < lines.length; i++) {
          const before = await page.evaluate((i) => {
            globalThis.document.querySelector("#voice-check").dataset.index = i;
            return globalThis.__voiceCheck.length;
          }, i);
          if (width < 600) await page.locator("#voice-check").tap();
          else await page.locator("#voice-check").click();
          await page.waitForFunction(
            ({ before, key }) =>
              globalThis.__voiceCheck
                .slice(before)
                .some(
                  (a) =>
                    a.src.endsWith("/" + key + ".mp3") && a.playing && a.ended,
                ),
            { before, key: keys[i] },
            { timeout: 20000 },
          );
          const result = await page.evaluate(
            (before) => ({
              media: globalThis.__voiceCheck.slice(before),
              shown: globalThis.__game.ui._cur?.voiceKey,
              error: globalThis.__voiceError,
            }),
            before,
          );
          assert.equal(result.media.length, 1);
          assert.equal(result.shown, keys[i]);
          assert.equal(result.error, undefined);
          assert.ok(
            result.media[0].time > 0.15 &&
              result.media[0].duration > 0.15 &&
              !result.media[0].error,
          );
          report.records.push({
            node: lines[i].node,
            speaker: lines[i].line.say,
            requested: keys[i],
            ...result,
          });
          if (width < 600) await page.locator("#talkHit").tap();
          else await page.locator("#talkHit").click();
          await page.waitForFunction(
            () => globalThis.__voiceDone === true,
            null,
            { timeout: 5000 },
          );
        }
        assert.deepEqual(report.errors, []);
        assert.deepEqual(report.forbidden, []);
        console.log(
          `PASS ${mc}: ${lines.length} authored clips activated, decoded, advanced and ended`,
        );
      } catch (error) {
        report.failure = error.stack;
        throw error;
      } finally {
        fs.writeFileSync(
          `${out}/${width}-report.json`,
          JSON.stringify(report, null, 2),
        );
        await context.close();
      }
    }
  },
  { timeoutMs: 230000 },
);
