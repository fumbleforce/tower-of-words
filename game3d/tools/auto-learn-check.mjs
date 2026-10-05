// Auto survives a learning scene (docs/game/controls-and-ui.md, The dialogue box): Auto is turned on in the train's
// "sit" scene, which teaches gaijin with a typing prompt. Auto must still be on at the prompt and after the player
// taps into it and answers, and must move the lines after it on by itself. With Settings > Skip skill checks on, the
// prompt is a line showing the word, and Auto moves past it with no answer.
//   node game3d/tools/auto-learn-check.mjs [w] [h] [skip]     skip: 1 = the setting on; shots in game3d/shots/auto-learn/
import fs from "node:fs";
import path from "node:path";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
const [W = "1366", H = "860", SKIP = "0"] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, "/game3d").replace(/\/game3d$/, "");
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, "shots/auto-learn");
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const skip = SKIP === "1";
const res = [];
const ok = (test, pass, detail = "") => res.push({ test, pass: !!pass, detail });
const AFTER = /I'm Mio\. I'm also B2/;
await withBrowserJob("auto-learn-check", async (b) => {
  const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript((skip) => {
    localStorage.setItem("amakawa-vnbar", "1");
    localStorage.setItem(
      "amakawa-settings",
      JSON.stringify({ v: 2, voiceOn: false, textSpeed: "instant", autoSpeed: "fast", skipChecks: skip }),
    );
  }, skip);
  await p.goto(`${base}/index.html?shell=talk&place=train&skip&q=0`);
  await p.waitForFunction(() => window.__shellReady, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    const g = window.__game;
    window.__lines = [];
    const say = g.ui.say.bind(g.ui);
    window.__times = [];
    const t0 = performance.now();
    g.ui.say = (sp, text, o) => (window.__lines.push(text), window.__times.push(Math.round(performance.now() - t0)), say(sp, text, o));
    // the "sit" scene's lines and its typing prompt and replies, without the walk to the seat before them
    const nodes = g.runner.story.nodes;
    nodes.__probe = nodes.sit.filter((s) => s.say || s.choice || s.do === "type");
    g.beat(() => g.runner.run("__probe"));
  });
  // on a timeout: what the page shows, then fail
  const dump = async (e) => {
    const st = await p.evaluate(() => ({
      lines: window.__lines,
      talk: document.querySelector("#talk")?.hidden,
      cls: document.querySelector("#talk")?.className,
      auto: document.body.classList.contains("vn-auto"),
      busy: window.__game.busy,
      adv: !!window.__game.ui._advance,
      autoGo: !!window.__game.ui._autoGo,
      paused: window.__shell?.isPaused?.(),
      times: window.__times,
    }));
    console.log(errs, st);
    throw e;
  };
  await p.waitForSelector("#talk:not([hidden]) #vnbar:not([hidden])", { timeout: 20000 }).catch(dump);
  const tap = (l) => (phone ? l.tap() : l.click());
  await tap(p.locator("#vnbar .auto"));
  const isAuto = () => p.evaluate(() => document.body.classList.contains("vn-auto"));
  ok("auto on", await isAuto());
  if (!skip) {
    await p.waitForSelector("#talk.typing .tp-in", { timeout: 30000 }).catch(dump);
    await p.waitForTimeout(400);
    ok("auto still on at the prompt", await isAuto());
    await p.screenshot({ path: path.join(out, `${W}x${H}-prompt.png`) });
    // the player taps into the field and the word's play button: neither stops Auto
    const inp = p.locator("#talk .tp-in");
    await tap(inp);
    const wp = p.locator("#talk .tp-jp .wplay");
    if (await wp.count()) await tap(wp);
    await inp.focus();
    await p.keyboard.type("gaijin");
    ok("auto still on after answering", await isAuto());
  } else {
    await p.waitForFunction(() => window.__lines.some((t) => /Gaijin\. Um/.test(t || "")), null, { timeout: 30000 }).catch(dump);
    await p.waitForTimeout(150);
    ok("no typing field", !(await p.locator("#talk.typing").count()));
    await p.screenshot({ path: path.join(out, `${W}x${H}-skipped.png`) });
  }
  const t0 = Date.now();
  await p
    .waitForFunction((s) => window.__lines.some((t) => new RegExp(s).test(t || "")), AFTER.source, { timeout: 30000 })
    .catch(() => {});
  const went = await p.evaluate((s) => window.__lines.some((t) => new RegExp(s).test(t || "")), AFTER.source);
  ok("auto carries on after the prompt", went, `${Date.now() - t0} ms`);
  ok("auto still on after it", await isAuto());
  // the word is known and its typed flag set either way; a skipped check doesn't count as practice
  const st = await p.evaluate(async () => {
    const { known } = await import("./js/lang.js");
    const { flags } = await import("./js/narrative/state.js");
    const { practiced } = await import("./js/mastery.js");
    const typed = Object.keys(flags).some((k) => /typed.*gaijin/.test(k) && flags[k]);
    return { known: known.has("gaijin"), typed, practiced: practiced("gaijin") };
  });
  ok("gaijin known, typed flag set", st.known && st.typed, JSON.stringify(st));
  ok(skip ? "not counted as practice" : "counted as practice", st.practiced === (skip ? 0 : 1), JSON.stringify(st));
  // the replies after it: picking one doesn't stop Auto, and it moves the reply's scene on
  await p.waitForSelector("#talk .chips .chip:not(:disabled)", { timeout: 30000 }).catch(dump);
  await p.waitForTimeout(1000); // a phone arms the replies after a moment
  await tap(p.locator("#talk .chips .chip").first());
  ok("auto still on after picking a reply", await isAuto());
  const card = () => window.__lines.some((t) => /It's on your card/.test(t || ""));
  await p.waitForFunction(card, null, { timeout: 30000 }).catch(() => {});
  ok("auto moves the reply's lines on", (await p.evaluate(card)) && (await isAuto()));
  ok("no page errors", !errs.length, errs.join(" | "));
});
for (const r of res) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.test}${r.detail ? "  " + r.detail : ""}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
