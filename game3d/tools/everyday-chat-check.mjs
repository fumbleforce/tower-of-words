// Native Chat menus and saved memory; deliberate day/place fixtures, not a complete day route or voice test.
import assert from "node:assert/strict";
import fs from "node:fs";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { blockedSource } from "../../tools/bible/check-scope.mjs";
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || "game3d",
  out = process.argv[3] || "game3d/shots/everyday-chat";
const url = `http://127.0.0.1:${process.env.PORT || 8771}/${base}/index.html`;
fs.mkdirSync(out, { recursive: true });
const report = {
  width,
  scope:
    "Native menus/text/memory with explicit schedule and production approachSpot position fixtures; no voice or full-day claim",
  checks: [],
  errors: [],
  forbidden: [],
};
await withBrowserJob(
  "everyday-chat",
  async (browser) => {
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
          voiceOn: false,
          textSpeed: "instant",
          music: 0,
          ambience: 0,
        }),
      );
      globalThis.localStorage.setItem(
        "amakawa-onboard",
        JSON.stringify({ moved: true, talked: true, uses: 8, sayUsed: true }),
      );
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    const press = async (el) => (width < 600 ? el.tap() : el.click());
    const check = (name, value) => {
      assert.ok(value, name);
      report.checks.push(name);
      console.log("PASS", width, name);
    };
    const shot = async (name) => {
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${out}/${width}-${name}.png` });
    };
    async function drive(picks = [], word = null) {
      for (let i = 0; i < 130; i++) {
        if (await page.locator("#talk.typing .tp-in").isVisible()) {
          assert.ok(word, "unexpected teaching");
          await page.locator(".tp-in").fill(word);
          await page.locator(".tp-in").press("Enter");
          word = null;
        } else {
          const buttons = page.locator("#talk .chips button:not([disabled])");
          if (await buttons.count()) {
            assert.ok(
              picks.length,
              `Unexpected choices: ${await buttons.allTextContents()}`,
            );
            const pick = picks.shift();
            await page.waitForTimeout(950);
            await press(buttons.filter({ hasText: pick }).first());
          } else if (await page.locator("#talk .more").isVisible())
            await press(page.locator("#talkHit"));
          else if (
            await page.evaluate(
              () => !globalThis.__game.busy && !globalThis.__game.ui.talking,
            )
          ) {
            assert.equal(picks.length, 0);
            return;
          }
        }
        await page.waitForTimeout(160);
      }
      throw new Error("dialogue drive exceeded bound");
    }
    async function fixture(day, period, place) {
      console.log("fixture", day, period, place);
      await page.evaluate(
        async ({ day, period, place }) => {
          const g = globalThis.__game,
            { flags } = await import("./js/narrative/state.js");
          g.sim.day = day;
          flags.day = day;
          await g.hooks.period({ to: period });
          if (g.place.name !== place)
            await g.travel(place, { fast: true, via: g.place.name });
        },
        { day, period, place },
      );
      await page.waitForFunction(
        (place) =>
          globalThis.__game.place.name === place && !globalThis.__game.busy,
        place,
        { timeout: 45000 },
      );
    }
    async function menu(id) {
      console.log("menu", id);
      await page.evaluate(async (id) => {
        const g = globalThis.__game,
          { approachSpot } = await import("./js/move.js"),
          t = g.markers.list.find((t) => t.id === id);
        if (!t || !(id === "mio" ? g.mioNpc : g.place.people[id])?.root.visible)
          throw new Error(`Not scheduled: ${id}`);
        const p = approachSpot(g, t) || t.spot();
        g.walker.stop();
        g.player.root.position.set(p[0], 0, p[1]);
        g.place.cam.snap(g.player.root.position);
      }, id);
      await page.waitForTimeout(900);
      await page.waitForFunction(
        (id) => {
          const el = globalThis.__game.markers.list
            .find((t) => t.id === id)
            ?.el?.querySelector(".pin");
          return (
            el &&
            el.getClientRects().length > 0 &&
            globalThis.getComputedStyle(el).pointerEvents === "auto"
          );
        },
        id,
        { timeout: 15000 },
      );
      const box = await page.evaluate((id) => {
        const r = globalThis.__game.markers.list
          .find((t) => t.id === id)
          .el.querySelector(".pin")
          .getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }, id);
      if (width < 600)
        await page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
      else
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForFunction(
        (id) =>
          globalThis.__game.ui.actFor?.id === id &&
          !globalThis.document.querySelector("#actMenu").hidden,
        id,
        { timeout: 16000 },
      );
      return page.locator("#actMenu");
    }
    async function chat(id) {
      await menu(id);
      check(
        `native Chat row ${id}`,
        await page.locator("#actMenu .topic").isVisible(),
      );
      await press(page.locator("#actMenu .topic"));
      await page.waitForTimeout(250);
    }
    const state = () =>
      page.evaluate(async () => ({
        flags: { ...(await import("./js/narrative/state.js")).flags },
        known: [...(await import("./js/lang.js")).known],
        memory: (
          await import("./js/conversations/state.js")
        ).conversationMemory.toJSON(),
        log: (await import("./js/ui/backlog.js")).logToJSON(),
        met: [...globalThis.__game.sim.met],
        day: globalThis.__game.sim.day,
      }));
    try {
      await page.goto(
        `${url}?day=2&place=office&mc=${width < 600 ? "carina" : "eric"}&q=0`,
      );
      await page.waitForFunction(
        () =>
          globalThis.__game?.place?.name === "office" &&
          !globalThis.__game.busy,
        null,
        { timeout: 65000 },
      );
      // Sample opening history knows the office team; yasumi is deliberately absent to test later understanding.
      await page.evaluate(async () => {
        const { known } = await import("./js/lang.js"),
          { flags } = await import("./js/narrative/state.js");
        known.delete("yasumi");
        flags.d2_ticket_done = true;
        globalThis.__game.place.hooks.officeDay2({ state: "arrive" });
      });
      await fixture(2, "afternoon", "office");
      if (process.env.SPEAKERS_ONLY === "1") {
        report.scope =
          "Native scheduled Chat menu and first NPC spoken line staging audit; explicit schedule/approach fixtures, no full-day or voice claim";
        async function speaker(id, topic, rest) {
          await chat(id);
          await page.waitForFunction(
            () => !globalThis.document.querySelector("#talk .chips.arming"),
          );
          await page.waitForTimeout(1600);
          await shot(`${id}-menu`);
          if (process.env.SPEAKER_CONTINUE && id !== "guard") {
            const snapshot = () =>
              page.evaluate((id) => {
                const g = globalThis.__game,
                  r = g.place.people[id];
                return {
                  close: g.place.cam.close,
                  position: r.root.position.toArray(),
                  yaw: r.root.rotation.y,
                  player: {
                    position: g.player.root.position.toArray(),
                    yaw: g.player.root.rotation.y,
                    facing: g.walker.facing,
                    target: g.walker.targetFacing,
                  },
                };
              }, id);
            const before = await snapshot();
            if (width < 600) await press(page.locator("#qsaveBtn"));
            else await page.keyboard.press("F5");
            await page.waitForTimeout(700);
            await page.goto(`${url}?q=0`);
            await press(page.locator("#title .mcont"));
            await press(page.locator('.slot[data-id="quick"]'));
            await page.waitForFunction(
              (id) =>
                globalThis.__game?.place?.cam?.close?.conversationShot?.who ===
                  id &&
                globalThis.document.querySelector("#talk .chips button") &&
                !globalThis.document.body.classList.contains("at-title"),
              id,
              { timeout: 65000 },
            );
            await page.waitForTimeout(2200);
            const after = await snapshot();
            report[`${id}Continue`] = { before, after };
            const { player: bp, ...brest } = before,
              { player: ap, ...arest } = after;
            assert.deepEqual(arest, brest);
            assert.deepEqual(ap.position, bp.position);
            const desired = Math.atan2(
              after.position[0] - ap.position[0],
              after.position[2] - ap.position[2],
            );
            const error = Math.abs(
              Math.atan2(
                Math.sin(ap.yaw - desired),
                Math.cos(ap.yaw - desired),
              ),
            );
            assert.ok(error < Math.PI / 18, `restored listener faces ${id}: ${error}`);
            check(
              `${id} real title Continue preserves shot and actor position`,
              true,
            );
            await shot(`${id}-continued`);
          }
          await press(
            page
              .locator("#talk .chips button")
              .filter({ hasText: topic })
              .first(),
          );
          const name =
            id === "guard"
              ? await page.evaluate(
                  (id) => globalThis.__game.runner.speaker(id).name,
                  id,
                )
              : id[0].toUpperCase() + id.slice(1);
          for (let i = 0; i < 60; i++) {
            await page.waitForTimeout(250);
            const who = await page
              .locator("#talk .who .nm")
              .allTextContents()
              .then((a) => a.join(""));
            if (
              who?.toLowerCase().includes(name.toLowerCase()) &&
              (await page.locator("#talk .more").isVisible())
            )
              break;
            if (await page.locator("#talk .more").isVisible())
              await press(page.locator("#talkHit"));
          }
          check(
            `${id} actual NPC line reached`,
            (await page.locator("#talk .who .nm").innerText())
              .toLowerCase()
              .includes(name.toLowerCase()),
          );
          await page.waitForTimeout(1400);
          await shot(`${id}-spoken`);
          report[`${id}SpokenFacing`] = await page.evaluate((id) => {
            const g = globalThis.__game,
              a = g.player.root.position,
              b = g.place.people[id].root.position;
            return {
              yaw: g.player.root.rotation.y,
              desired: Math.atan2(b.x - a.x, b.z - a.z),
            };
          }, id);
          if (
            process.env.ANGLE_PROBE &&
            id === (process.env.KURO_ONLY ? "kuro" : "aoi")
          ) {
            for (const yaw of [-0.5, -1.5, -2.0]) {
              await page.evaluate((yaw) => {
                const g = globalThis.__game;
                g.place.cam.close.conversationShot.yaw = yaw;
                g.place.cam.snap(g.player.root.position);
              }, yaw);
              await shot(`${id}-angle-${yaw}`);
            }
          }
          await drive(rest);
          check(
            `${id} camera releases to normal view`,
            await page.evaluate(() => !globalThis.__game.place.cam.close),
          );
        }
        if (!process.env.SPEAKER_REMAINDER)
          await speaker("emi", "What makes things easier", [
            "I’ll bring you the result",
          ]);
        if (process.env.EMI_ONLY) return;
        if (!process.env.LATER_SPEAKERS) {
          await fixture(2, "afternoon", "gate");
          await speaker("guard", "Stop for a moment", ["I won’t keep you"]);
        }
        await page.evaluate(async () => {
          const { flags } = await import("./js/narrative/state.js"),
            { meet } = await import("./js/sim.js");
          for (const [id, flag] of [
            ["aoi", "d3_aoi_intro"],
            ["rei", "d4_rei_intro"],
            ["kuro", "d3_kuro_intro"],
          ]) {
            flags[flag] = true;
            meet(globalThis.__game, id);
          }
        });
        await fixture(10, "lunch", "shotengai");
        if (process.env.INCLUDE_KURO) await speaker("kuro", "Say hello", []);
        if (process.env.KURO_ONLY) {
          fs.writeFileSync(
            `${out}/${width}-speakers.json`,
            JSON.stringify(report, null, 2),
          );
          return;
        }
        if (!process.env.REI_ONLY)
          await speaker("aoi", "How are you finding the job", [
            "Let her get back",
          ]);
        await speaker("rei", "Do your customers", ["I’d let it ring"]);
        assert.deepEqual(report.errors, []);
        assert.deepEqual(report.forbidden, []);
        return;
      }
      if (process.env.CHOICE_ONLY === "1") {
        report.scope =
          "Targeted native choice rendering replay with authored remembered-line and known-word fixture; no voice or learning claim";
        await page.evaluate(async () => {
          const g = globalThis.__game,
            { known } = await import("./js/lang.js");
          const { flags } = await import("./js/narrative/state.js");
          const { conversationMemory } =
            await import("./js/conversations/state.js");
          const quote = g.story.nodes.chat_mio_home_quote.find(
            (step) => step.overheard,
          );
          conversationMemory.hear({
            who: quote.say,
            text: quote.text,
            known: new Set(),
            source: { day: 2, period: "afternoon", place: "office" },
          });
          known.add("yasumi");
          flags.chat_mio_home = true;
        });
        await chat("mio");
        await page.waitForFunction(
          () => !globalThis.document.querySelector("#talk .chips.arming"),
        );
        const word = page.locator('#talk .chips .jp[data-w="yasumi"]');
        check(
          "known reply displays Japanese instead of literal token",
          (await word.innerText()) === "休み",
        );
        check(
          "choice has no unresolved word token",
          !(await page.locator("#talk .chips").innerText()).includes(
            "{yasumi}",
          ),
        );
        await page.waitForTimeout(2000);
        report.framing = await page.evaluate(() => {
          const g = globalThis.__game,
            m = g.mioNpc,
            p = g.player;
          return {
            mio: {
              position: m.root.position.toArray(),
              yaw: m.root.rotation.y,
              seated: m.seated,
            },
            player: {
              position: p.root.position.toArray(),
              yaw: p.root.rotation.y,
            },
            space: g.place.space.rotation.toArray(),
            camera: g.place.cam.camera.position.toArray(),
            close: g.place.cam.close,
          };
        });
        await shot("mio-expanded-choice");
        if (process.env.CHAT_CONTINUE === "1") {
          const before = await page.evaluate(() => {
            const g = globalThis.__game;
            return {
              close: g.place.cam.close,
              position: g.mioNpc.root.position.toArray(),
              yaw: g.mioNpc.root.rotation.y,
            };
          });
          if (width < 600) await press(page.locator("#qsaveBtn"));
          else await page.keyboard.press("F5");
          await page.waitForTimeout(700);
          await page.goto(`${url}?q=0`);
          await press(page.locator("#title .mcont"));
          await press(page.locator('.slot[data-id="quick"]'));
          await page.waitForFunction(
            () =>
              globalThis.__game?.place?.cam?.close?.conversationShot &&
              globalThis.document.querySelector(
                '#talk .chips .jp[data-w="yasumi"]',
              ) &&
              !globalThis.document.body.classList.contains("at-title"),
            null,
            { timeout: 65000 },
          );
          await page.waitForTimeout(2200);
          const after = await page.evaluate(() => {
            const g = globalThis.__game;
            return {
              close: g.place.cam.close,
              position: g.mioNpc.root.position.toArray(),
              yaw: g.mioNpc.root.rotation.y,
            };
          });
          assert.deepEqual(after, before);
          check(
            "real title Continue restores seated conversation shot and position",
            true,
          );
          await shot("mio-conversation-continued");
        }
        await press(word);
        for (let advance = 0; advance < 20; advance++) {
          if (
            (await page.locator("#talk").innerText()).includes(
              "Yes. Or at least",
            )
          )
            break;
          await page.waitForTimeout(250);
          if (await page.locator("#talk .more").isVisible())
            await press(page.locator("#talkHit"));
        }
        assert.ok(
          (await page.locator("#talk").innerText()).includes(
            "Yes. Or at least",
          ),
        );
        await shot("mio-listening-dialogue");
        await drive(["I know a few words"]);
        const completed = await state();
        check(
          "expanded choice remains selectable and completes its intended branch",
          completed.flags.chat_mio_break_understood,
        );
        check(
          "authored camera release clears conversation angles",
          await page.evaluate(
            () =>
              !globalThis.__game.place.cam.close &&
              globalThis.__game.place.cam.yaw === 0,
          ),
        );
        report.final = completed;
        assert.deepEqual(report.errors, []);
        assert.deepEqual(report.forbidden, []);
        return;
      }
      await chat("mio");
      await shot("mio-menu");
      await drive(["Do you go back", "That sounds nice"]);
      let s = await state();
      check(
        "Mio remark recorded while yasumi unknown",
        s.memory.records.some(
          (r) =>
            r.id === "mio_mother_weekends" && !r.knownAtTime.includes("yasumi"),
        ),
      );
      await chat("emi");
      await drive(["What makes things easier", "I’ll bring you the result"]);
      await fixture(2, "afternoon", "gate");
      await chat("guard");
      await drive(["Stop for a moment", "I won’t keep you"]);
      await fixture(2, "afternoon", "forecourt");
      await menu("kuro");
      check(
        "pre-introduction Kuro has no shared Chat",
        (await page.locator("#actMenu .topic").count()) === 0,
      );
      await shot("kuro-before-introduction");
      await press(page.locator("#actMenu .use"));
      await drive(["I’ll let you get back"]);
      s = await state();
      check(
        "ordinary day2 Talk does not introduce Kuro",
        !s.flags.d3_kuro_intro && !s.met.includes("kuro"),
      );
      // Later save fixture: introductions were completed on the opening weekend; this is not an introduction replay.
      await page.evaluate(async () => {
        const { flags } = await import("./js/narrative/state.js"),
          { meet } = await import("./js/sim.js");
        for (const [id, flag] of [
          ["kuro", "d3_kuro_intro"],
          ["aoi", "d3_aoi_intro"],
          ["rei", "d4_rei_intro"],
        ]) {
          flags[flag] = true;
          meet(globalThis.__game, id);
        }
      });
      await fixture(10, "lunch", "shotengai");
      await chat("kuro");
      await shot("kuro-known-menu");
      await drive(["How do I say"], "yasumi");
      s = await state();
      check(
        "native optional Kuro typing teaches yasumi",
        s.known.includes("yasumi"),
      );
      await chat("aoi");
      await drive(["How are you finding the job", "Let her get back"]);
      await chat("rei");
      await drive(["Do your customers", "Do you answer"]);
      await fixture(12, "afternoon", "office");
      await chat("mio");
      await shot("mio-followup");
      await drive(["Was your mother telling", "I know a few words"]);
      s = await state();
      check(
        "heard elsewhere then learned word opens Mio follow-up",
        s.flags.chat_mio_break_understood,
      );
      const oldRemark = s.memory.records.find(
        (r) => r.id === "mio_mother_weekends",
      );
      check(
        "original hearing knowledge remains unknown",
        !oldRemark.knownAtTime.includes("yasumi"),
      );
      if (width < 600) await press(page.locator("#qsaveBtn"));
      else await page.keyboard.press("F5");
      await page.waitForTimeout(700);
      const before = await state();
      await page.goto(`${url}?q=0`);
      await press(page.locator("#title .mcont"));
      await press(page.locator('.slot[data-id="quick"]'));
      await page.waitForFunction(
        () =>
          globalThis.__game?.place?.name === "office" &&
          !globalThis.__game.busy &&
          !globalThis.document.body.classList.contains("at-title"),
        null,
        { timeout: 65000 },
      );
      const after = await state();
      assert.deepEqual(after.memory, before.memory);
      assert.deepEqual(after.known, before.known);
      assert.deepEqual(
        after.log.items,
        JSON.parse(JSON.stringify(before.log.items)),
      );
      check(
        "native quick save/title Continue preserves knowledge, remarks and raw history",
        after.flags.chat_mio_break_understood && after.day === 12,
      );
      await chat("mio");
      await shot("continued-menu");
      await drive(["Does your mother still ask"]);
      check("continued follow-up becomes personal repeat", true);
      report.final = await state();
      assert.deepEqual(report.errors, []);
      assert.deepEqual(report.forbidden, []);
    } catch (error) {
      await shot("failure-" + Date.now()).catch(() => {});
      report.failure = error.stack;
      report.state = await state().catch(() => null);
      throw error;
    } finally {
      fs.writeFileSync(
        `${out}/${width}-report.json`,
        JSON.stringify(report, null, 2),
      );
      await context.close();
    }
  },
  { timeoutMs: 480000 },
);
