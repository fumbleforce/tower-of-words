// The typing prompt's word plays Mio's clip: tap the word and its play button while a half-typed answer is in the
// field; the field must keep focus and text, the prompt must stay up, and Mio's clip must play.
//   node game3d/tools/type-word-play.mjs [w] [h]     writes game3d/shots/type-word-play/<w>x<h>/
// Works from a worktree too: the review server serves the whole repo, so the page comes from this file's own game3d/.
import fs from "node:fs";
import path from "node:path";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
const [W = "1366", H = "860"] = process.argv.slice(2);
const WORD = "yoroshiku";
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const repo = G.replace(
  /\/\.claude\/worktrees\/[^/]+\/game3d$/,
  "/game3d",
).replace(/\/game3d$/, "");
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/type-word-play/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const res = [];
await withBrowserJob("type-word-play", async (b) => {
  const p = await b.newPage({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
  });
  const clips = [];
  p.on(
    "request",
    (r) => /audio\/word-/.test(r.url()) && clips.push(r.url().split("/").pop()),
  );
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/index.html?shell=talk&place=gate&skip&q=0`);
  await p.waitForFunction(() => window.__shellReady, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  await p.evaluate((w) => {
    window.__game.runner.trigger = () => false;
    window.__typed = null;
    // count the replays: the clip is fetched once and then played from memory, so requests alone miss the second tap
    const u = window.__game.ui,
      sw = u.sayWord.bind(u);
    window.__said = [];
    u.sayWord = (id, el) => (window.__said.push(id), sw(id, el));
    window.__game.ui
      .typePrompt(
        w,
        {
          who: { name: "Mio", color: "#5fc6bf" },
          text: "Say it to the guard.",
          whoId: "mio",
        },
        { cancel: true },
      )
      .then((v) => (window.__typed = v));
  }, WORD);
  await p.waitForSelector("#talk.typing .tp-in");
  await p.waitForTimeout(300);
  const inp = p.locator("#talk .tp-in");
  if (phone) await inp.tap();
  else await inp.click();
  await p.keyboard.type("yoro");
  await p.screenshot({ path: path.join(out, "00-prompt.png") });
  const box = await p.locator("#talk .tp-word").boundingBox();
  await p.screenshot({
    path: path.join(out, "01-word-close.png"),
    clip: {
      x: Math.max(0, box.x - 12),
      y: Math.max(0, box.y - 12),
      width: Math.min(+W, box.width + 24),
      height: box.height + 24,
    },
  });
  for (const sel of ["#talk .tp-jp .wplay", "#talk .tp-jp .jp[data-w]"]) {
    const s0 = await p.evaluate(() => window.__said.length);
    const xy = await p.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getClientRects()[0];
      return [r.x + r.width / 2, r.y + r.height / 2];
    }, sel);
    if (!xy) {
      res.push({ test: `tap ${sel}`, pass: false, detail: "not found" });
      continue;
    }
    if (phone) await p.touchscreen.tap(xy[0], xy[1]);
    else await p.mouse.click(xy[0], xy[1]);
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({
      focus: document.activeElement?.className,
      value: document.querySelector("#talk .tp-in")?.value,
      typing: document.querySelector("#talk").classList.contains("typing"),
      typed: window.__typed,
      said: window.__said.length,
    }));
    // Mio's clip is fetched (first tap) or replayed from memory (later taps)
    const played =
      st.said === s0 + 1 && clips.some((c) => c.startsWith(`word-${WORD}.`));
    res.push({
      test: `tap ${sel}`,
      pass:
        played &&
        st.focus === "tp-in" &&
        st.value === "yoro" &&
        st.typing &&
        st.typed === null,
      detail: JSON.stringify({ played, ...st }),
    });
  }
  await p.screenshot({ path: path.join(out, "02-after.png") });
  // the answer still finishes the prompt
  await p.keyboard.type("shiku onegaishimasu");
  await p.waitForTimeout(600);
  res.push({
    test: "typing on finishes the word",
    pass: (await p.evaluate(() => window.__typed)) === true,
    detail: "",
  });
  res.push({
    test: "no page errors",
    pass: !errs.length,
    detail: errs.join(" | "),
  });
});
for (const r of res)
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.test}  ${r.detail}`);
console.log(`artifacts: ${out}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
