// What a hover or a near target outlines (Jørgen, 2026-10-14: "one of the chair also includes two of the tiles and the
// table into hits hoverable state, this should not happen anywhere"; issue #579). For every enabled target in each place
// (default: the office and the gate), the meshes the outline takes, selected the way main.js does it (highlight.js
// outlineMeshes over the target's objects), must belong to that target only:
//   - no merged batch mesh, whose triangles hold other things' too;
//   - no floor or floor tile (a flat piece at floor level, wider than 0.3 m) for a target with no object of its own;
//   - no mesh that another enabled target also outlines;
//   - no mesh whose centre is more than 0.6 m from a target's anchor when the target has no object of its own.
// Then the desktop hovers HOVER (or the first target with a violation) and checks the hover is that target. The phone
// has no hover, so Eric stands in reach of the same target and its outline is shot instead.
// Usage: node game3d/test/interaction/hover-check.mjs [width] [height] [place...]   (BASE=<path to game3d> for a worktree)
// Shots: game3d/shots/hover-check/<place>-<width>.png (desktop hover) and <place>-<width>-near.png (phone, in reach).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../../tools/lib/browser-job.mjs';

const args = process.argv.slice(2);
const [W = '1366', H = '860'] = args.filter((a) => /^\d+$/.test(a));
const places = args.filter((a) => !/^\d+$/.test(a));
const PLACES = places.length ? places : ['office', 'gate'];
const width = +W,
  phone = width < 700;
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`;
const out = new URL('../../shots/hover-check/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const HOVER = process.env.HOVER || '';
const TAG = process.env.TAG ? process.env.TAG + '-' : ''; // a prefix for the shots (before and after runs)

// runs in the page: the violations of every enabled target in the place, and the target to hover
function audit({ hoverId }) {
  return import('three').then(async (THREE) => {
    const { outlineMeshes, peopleRoots } = await import(
      new URL('js/gameplay/highlight.js', globalThis.location.href).href
    );
    const G = globalThis.__game,
      P = G.place;
    // every person's body in the place (the named people, the gate's workers and commuters): no other thing's outline takes one
    const people = peopleRoots(P);
    const personOf = (o) => {
      for (let p = o; p; p = p.parent) if (people.has(p)) return p;
      return null;
    };
    const box = new THREE.Box3(),
      v = new THREE.Vector3();
    const enabled = (m) => {
      try {
        return !!m.enabled();
      } catch {
        return false;
      }
    };
    const targets = G.markers.list.filter((m) => m.spot && enabled(m));
    const sets = new Map();
    const own = new Map();
    for (const m of targets) {
      const t = P.things?.[m.id];
      own.set(m.id, !!(t?.obj || t?.outline || P.people?.[m.id] || /person/.test(t?.kind || '')));
      sets.set(m.id, outlineMeshes(G.objsOf(m) || []));
    }
    const owners = new Map(); // mesh -> ids that outline it
    for (const [id, list] of sets) for (const o of list) owners.set(o, [...(owners.get(o) || []), id]);
    // a seat's host (the bench or stool it was made on): two seats of one piece may share its parts
    const { seatInventory } = await import(new URL('js/gameplay/seat-inventory.js', globalThis.location.href).href);
    const seats = seatInventory(P);
    const hosts = new Map(targets.map((m) => [m.id, seats.get(m.id)?.source || null]));
    const describe = (o) => {
      box.setFromObject(o);
      const c = box.getCenter(v);
      return { name: o.name || o.type, geo: o.geometry?.type, at: [c.x, c.y, c.z].map((n) => +n.toFixed(2)) };
    };
    const violations = [];
    for (const m of targets) {
      const anchor = m.anchor ? m.anchor(new THREE.Vector3()) : null;
      for (const o of sets.get(m.id)) {
        const d = describe(o);
        const body = personOf(o);
        if (body && body !== (P.people?.[m.id]?.root || P.extras?.[m.id]?.root))
          violations.push({ target: m.id, kind: "someone else's body", ...d });
        // a mesh another enabled target outlines too: allowed only for seats of one piece, and never a flat top or a tile
        const others = (owners.get(o) || []).filter((id) => id !== m.id);
        box.setFromObject(o);
        const flat0 = box.getSize(new THREE.Vector3());
        const flatPiece = flat0.y <= 0.05 && Math.max(flat0.x, flat0.z) >= 0.3;
        const host = hosts.get(m.id);
        const bad = others.filter((id) => flatPiece || !host || hosts.get(id) !== host);
        if (bad.length) violations.push({ target: m.id, kind: 'shared with ' + bad.join(','), ...d });
        // a person's body and a thing's own model are its own, merged batch or not
        if (own.get(m.id)) continue;
        if (o.userData?.perfBatch) violations.push({ target: m.id, kind: 'merged batch', ...d });
        box.setFromObject(o);
        const sz = box.getSize(new THREE.Vector3());
        const c = box.getCenter(new THREE.Vector3());
        // a floor tile, unless the target stands on it down on the floor (a photo lying on the floor)
        const standsOn =
          !!anchor &&
          anchor.y <= 0.1 &&
          anchor.x >= box.min.x - 0.05 &&
          anchor.x <= box.max.x + 0.05 &&
          anchor.z >= box.min.z - 0.05 &&
          anchor.z <= box.max.z + 0.05;
        if (box.min.y <= 0.02 && sz.y <= 0.05 && Math.max(sz.x, sz.z) >= 0.3 && !standsOn)
          violations.push({ target: m.id, kind: 'floor or tile', ...d });
        if (anchor && Math.hypot(c.x - anchor.x, c.z - anchor.z) > 0.6)
          violations.push({ target: m.id, kind: 'out of reach', ...d });
      }
    }
    // the outline puts its mask bit on a mesh only while it draws it: a mesh still carrying it is drawn in every outline (#579)
    const { MASK_BIT } = await import(new URL('js/perf/outline.js', globalThis.location.href).href);
    P.space.traverse((o) => {
      if ((o.isMesh || o.isSprite) && o.layers.mask & MASK_BIT)
        violations.push({ target: 'outline mask', kind: 'left on the mask layer', ...describe(o) });
    });
    const hover =
      targets.find((m) => m.id === hoverId) ||
      targets.find((m) => violations.some((x) => x.target === m.id)) ||
      targets.find((m) => sets.get(m.id).length > 1) ||
      null;
    return {
      targets: targets.length,
      outlined: [...sets.values()].filter((s) => s.length).length,
      counts: Object.fromEntries([...sets].map(([id, list]) => [id, list.length])),
      violations,
      hover: hover ? { id: hover.id, label: P.things?.[hover.id]?.label || '' } : null,
    };
  });
}

// meshes still carrying the outline's mask bit after a draw (none should: the bit is put back at the end of each one)
const stuckMasks = (page) =>
  page.evaluate(async () => {
    const { MASK_BIT } = await import(new URL('js/perf/outline.js', globalThis.location.href).href);
    let n = 0;
    globalThis.__game.place.space.traverse((o) => {
      if ((o.isMesh || o.isSprite) && o.layers.mask & MASK_BIT) n++;
    });
    return n;
  });

await withBrowserJob(
  'hover-check',
  async (browser) => {
    const results = [];
    for (const place of PLACES) {
      const context = await browser.newContext({ viewport: { width, height: +H }, isMobile: phone, hasTouch: phone });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        globalThis.localStorage.setItem(
          'amakawa-onboard',
          JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }),
        );
      });
      try {
        await page.goto(`${base}/index.html?q=1&skip&place=${place}`);
        await page.waitForFunction(() => globalThis.__game?.player && globalThis.__game.saveEnabled, null, {
          timeout: 120000,
        });
        await page.waitForTimeout(2500);
        for (let i = 0; i < 40 && (await page.evaluate(() => !!globalThis.__game.busy)); i++) {
          await page.keyboard.press('Space');
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(800);
        const found = await page.evaluate(audit, { hoverId: HOVER });
        const r = { place, width, ...found, pass: found.violations.length === 0 };
        fs.writeFileSync(`${out}${TAG}${place}-${width}-counts.json`, JSON.stringify(found.counts, null, 1));
        if (found.hover) {
          if (!phone) {
            // Eric 1.2 m from the target, so it is on screen. The game can hold him for a scene or a trip first: wait for
            // that to end, then move him, and keep where he was and is (r.move) so a miss says why
            r.move = await page.evaluate(async (id) => {
              const G = globalThis.__game;
              const wait = () => new Promise((resolve) => setTimeout(resolve, 500));
              for (
                let i = 0;
                i < 120 && (G.busy || globalThis.document.body.classList.contains('trip') || G.walker.path);
                i++
              ) {
                G.skip?.();
                await wait();
              }
              const m = G.markers.list.find((x) => x.id === id);
              const [x, z] = m.spot();
              const before = [G.player.root.position.x, G.player.root.position.z].map((n) => +n.toFixed(2));
              G.walker.stop?.();
              if (G.player.seated) G.standUp();
              G.player.root.position.x = x - 1.2;
              G.player.root.position.z = z;
              G.walker.sync?.();
              G.place.cam?.snap?.(G.player.root.position);
              return { busy: !!G.busy, before, to: [x - 1.2, z].map((n) => +n.toFixed(2)) };
            }, found.hover.id);
            // the follow camera glides to Eric: give it time, then record both, so a miss says whether it followed
            await page.waitForTimeout(8000);
            r.move.camera = await page.evaluate(() => {
              const G = globalThis.__game;
              return G.place.camera?.position.toArray().map((n) => +n.toFixed(2));
            });
            r.move.after = await page.evaluate(() =>
              [globalThis.__game.player.root.position.x, globalThis.__game.player.root.position.z].map(
                (n) => +n.toFixed(2),
              ),
            );
            // aims: the middles of the target's six largest meshes, largest first. A small thing's parts can leave a gap at the
            // middle of all of them, and a mesh behind another thing (a covered desk's part behind Eric's desk) is never
            // what the mouse meets: the target counts as hovered when one of its meshes is picked from the screen
            const aims = await page.evaluate(async (id) => {
              const THREE = await import('three');
              const G = globalThis.__game,
                P = G.place,
                m = G.markers.list.find((x) => x.id === id);
              const { outlineMeshes } = await import(
                new URL('js/gameplay/highlight.js', globalThis.location.href).href
              );
              const cv = globalThis.document.querySelector('canvas').getBoundingClientRect();
              return outlineMeshes(G.objsOf(m))
                .map((o) => {
                  const b = new THREE.Box3().setFromObject(o);
                  return { b, s: b.getSize(new THREE.Vector3()).length() };
                })
                .sort((p, q) => q.s - p.s)
                .slice(0, 6)
                .map(({ b }) => {
                  const c = b.getCenter(new THREE.Vector3()).project(P.camera);
                  return { x: cv.left + ((c.x + 1) / 2) * cv.width, y: cv.top + ((1 - c.y) / 2) * cv.height };
                });
            }, found.hover.id);
            r.hovered = null;
            for (const [i, at] of aims.entries()) {
              await page.mouse.move(at.x, at.y);
              await page.waitForTimeout(900);
              r.hovered = await page.evaluate(() => globalThis.__game.hover?.id || null);
              if (r.hovered === found.hover.id) {
                r.aim = i + 1;
                break;
              }
            }
            r.pass = r.pass && r.hovered === found.hover.id;
            r.stuck = await stuckMasks(page);
            r.pass = r.pass && r.stuck === 0;
            await page.screenshot({ path: `${out}${TAG}${place}-${width}.png` });
          } else {
            // Eric stands 0.4 m from the target (the nearest one in reach), in reach of it (and the target is not hidden behind him), and the outline is
            // the near target's
            await page.evaluate(async (id) => {
              const G = globalThis.__game;
              for (
                let i = 0;
                i < 120 && (G.busy || globalThis.document.body.classList.contains('trip') || G.walker.path);
                i++
              ) {
                G.skip?.();
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              const m = G.markers.list.find((x) => x.id === id);
              const [x, z] = m.spot();
              G.walker.stop?.();
              G.player.root.position.x = x - 0.4;
              G.player.root.position.z = z;
              G.walker.sync?.();
              G.place.cam?.snap?.(G.player.root.position);
            }, found.hover.id);
            await page.waitForTimeout(8000);
            r.near = await page.evaluate(() => globalThis.__game.near?.id || null);
            r.stuck = await stuckMasks(page);
            r.pass = r.pass && r.stuck === 0;
            await page.screenshot({ path: `${out}${TAG}${place}-${width}-near.png` });
          }
        }
        r.errors = errors.slice(0, 5);
        results.push(r);
      } finally {
        await context.close();
      }
    }
    return results;
  },
  gpuWaitOptions(900, 285000),
).then((results) => {
  for (const r of results) {
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} ${r.place} ${r.width}: ${r.targets} targets, ${r.outlined} outlined, ${r.violations.length} violations` +
        (r.hover
          ? `; hover ${r.hover.id} (${r.hover.label})${r.hovered !== undefined ? ' picked ' + r.hovered + (r.aim ? ' on aim ' + r.aim : '') : ''}${r.near !== undefined ? ' near ' + r.near : ''}`
          : ''),
    );
    for (const x of r.violations.slice(0, 40))
      console.log(`  ${x.target}: ${x.kind} — ${x.name} ${x.geo} at ${JSON.stringify(x.at)}`);
    if (r.errors?.length) console.log('  page errors: ' + JSON.stringify(r.errors));
    if (r.move) console.log('  Eric: ' + JSON.stringify(r.move));
    if (r.stuck) console.log(`  ${r.stuck} mesh(es) still on the outline's mask layer after the draw`);
  }
  assert.ok(
    results.every((r) => r.pass),
    'hover outline takes other meshes (see the list above)',
  );
});
