// A tap on a visible pin acts like a tap on its target; crowded-out pins let the tap through to the world.
//   node game3d/tools/pin-tap-check.mjs [W H]   (office, phone size by default; shots in game3d/shots/no-ring/)
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
const [W = "390", H = "844"] = process.argv.slice(2);
const out = "game3d/shots/no-ring";
await withBrowserJob("pin-tap", async (b) => {
  const phone = +W < 700;
  const p = await b.newPage({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
  });
  p.setDefaultTimeout(90000);
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => {
    try {
      localStorage.setItem(
        "amakawa-onboard",
        JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false }),
      );
    } catch {}
  });
  await p.goto(
    `${process.env.BASE || "http://127.0.0.1:8771"}/game3d/index.html?q=1&place=office`,
  );
  await p.waitForFunction(
    () =>
      window.__game &&
      window.__game.player &&
      !document.body.classList.contains("at-title"),
  );
  await p.waitForTimeout(2500);
  for (
    let i = 0;
    i < 25 && (await p.evaluate(() => !!window.__game.busy));
    i++
  ) {
    await p.keyboard.press("Space");
    await p.waitForTimeout(500);
  }
  // Eric by the lift, on open floor: a tap on a pin further off has to walk him over
  await p.evaluate(() => {
    const G = window.__game;
    G.player.root.position.x = 0;
    G.player.root.position.z = 0;
  });
  await p.waitForTimeout(1500);
  const pins = await p.evaluate(() =>
    window.__game.markers.list
      .filter(
        (m) => m.el.style.display !== "none" && m.el.offsetParent !== null,
      )
      .map((m) => {
        const r = m.el.querySelector(".pin").getBoundingClientRect();
        const x = r.left + r.width / 2,
          y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          id: m.id,
          crowded: m.el.classList.contains("crowded"),
          x,
          y,
          onScreen: x > 0 && y > 0 && x < innerWidth && y < innerHeight,
          hitsPin: !!(hit && hit.closest(".mark") === m.el),
          hit: hit ? hit.tagName + (hit.id ? "#" + hit.id : "") : null,
        };
      }),
  );
  let bad = 0;
  for (const q of pins.filter((q) => q.onScreen)) {
    const ok = q.crowded ? !q.hitsPin : q.hitsPin;
    if (!ok) bad++;
    console.log(
      `${ok ? "ok " : "BAD"} ${q.id} crowded=${q.crowded} hitsPin=${q.hitsPin} top=${q.hit}`,
    );
  }
  // a crowded-out pin (hidden by a nearer one) must let the tap through
  const through = await p.evaluate(() => {
    const m = window.__game.markers.list.find(
      (x) => x.el.offsetParent !== null && x.el.style.display !== "none",
    );
    const r = m.el.querySelector(".pin").getBoundingClientRect();
    m.el.classList.add("crowded");
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    m.el.classList.remove("crowded");
    return !(hit && hit.closest(".mark") === m.el);
  });
  if (!through) bad++;
  console.log(`${through ? "ok " : "BAD"} a crowded pin lets the tap through`);
  const target =
    pins.find(
      (q) =>
        q.onScreen && !q.crowded && q.id === (process.env.PIN || "vending"),
    ) || pins.find((q) => q.onScreen && !q.crowded);
  await p.evaluate(() => {
    window.__clicks = [];
    document
      .getElementById("marks")
      .addEventListener(
        "click",
        (e) => window.__clicks.push(e.target.className),
        true,
      );
    window.addEventListener(
      "pointerdown",
      (e) =>
        window.__clicks.push(
          "pd:" + e.target.tagName + "." + e.target.className,
        ),
      true,
    );
  });
  const before = await p.evaluate(() => [
    window.__game.player.root.position.x,
    window.__game.player.root.position.z,
  ]);
  await p.screenshot({ path: `${out}/pintap-before-${W}x${H}.png` });
  if (phone) await p.touchscreen.tap(target.x, target.y);
  else await p.mouse.click(target.x, target.y);
  await p.waitForTimeout(2500);
  const after = await p.evaluate(() => ({
    pos: [
      window.__game.player.root.position.x,
      window.__game.player.root.position.z,
    ],
    busy: !!window.__game.busy,
    clicks: window.__clicks,
    hold: window.__game.hold,
    saying: window.__game.saying,
    walking: !!(window.__game.walker && window.__game.walker.path),
    talk: !!(
      document.getElementById("talk") && !document.getElementById("talk").hidden
    ),
  }));
  await p.screenshot({ path: `${out}/pintap-after-${W}x${H}.png` });
  const moved = Math.hypot(after.pos[0] - before[0], after.pos[1] - before[1]);
  console.log(
    `tapped pin ${target.id}: Eric moved ${moved.toFixed(2)} m, busy=${after.busy}, talk=${after.talk} ${JSON.stringify(after)}`,
  );
  console.log(
    bad || !(moved > 0.3 || after.busy) ? "FAIL" : "PASS",
    errs.length ? "ERR " + errs.join(" | ") : "",
  );
});
