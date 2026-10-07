// Native crowd prop diagnostics: the production bodies and animation poses in the plaza.
import fs from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";
import { scopedRoute } from "../../tools/bible/check-scope.mjs";
import { waitForGame } from "../test/support/wait-ready.mjs";
const base = process.env.BASE || "game3d";
const out = process.env.OUT || `game3d/shots/crowd-bags/${Date.now()}`;
const scale = process.env.SCALE || "100";
const mode = process.env.MODE || "normal";
const baseline = process.env.BASELINE === "1";
const report = {
  scale,
  mode,
  baseline,
  selection: {
    cases: process.env.CASES || "all",
    states: process.env.STATES || "all",
    skipCycles: !!process.env.SKIP_CYCLES,
  },
  errors: [],
  frames: [],
  cycles: [],
};
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  "crowd-bags",
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 860 },
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
    if (mode === "fallback" || mode === "bridge" || mode === "generated-office")
      await context.route("**/assets/characters/crowd-*/**", (route) =>
        route.fulfill({
          status: 404,
          body: "Diagnostic: approved crowd unavailable",
        }),
      );
    if (mode === "bridge")
      await context.route("**/assets/characters/chibi-gen-suit/**", (route) =>
        route.fulfill({
          status: 404,
          body: "Diagnostic: suit unavailable; retain cardigan proxy fallback",
        }),
      );
    const source = baseline
      ? execFileSync("git", ["show", "HEAD:game3d/js/crowd/looks.js"], {
          encoding: "utf8",
        })
      : fs.readFileSync(
          new URL("../js/crowd/looks.js", import.meta.url),
          "utf8",
        );
    report.sourceSha256 = createHash("sha256").update(source).digest("hex");
    fs.mkdirSync(`${out}/sources`, { recursive: true });
    fs.writeFileSync(`${out}/sources/looks.js`, source);
    report.helpers = {};
    for (const name of ["crowd-bag-check.mjs", "crowd-bag-clearance.mjs"]) {
      const body = fs.readFileSync(new URL(name, import.meta.url), "utf8");
      report.helpers[name] = createHash("sha256").update(body).digest("hex");
      fs.writeFileSync(`${out}/sources/${name}`, body);
      if (name !== "crowd-bag-check.mjs")
        await context.route(`**/tools/${name}*`, (route) =>
          route.fulfill({ contentType: "text/javascript", body }),
        );
    }
    report.sourceRequests = [];
    report.runtimeSources = {};
    if (!baseline)
      for (const name of ["motion", "bag-pose", "stops"]) {
        const path = new URL(`../js/crowd/${name}.js`, import.meta.url);
        if (!fs.existsSync(path)) continue;
        const body = fs.readFileSync(path, "utf8");
        report.runtimeSources[name] = createHash("sha256")
          .update(body)
          .digest("hex");
        fs.writeFileSync(`${out}/sources/${name}.js`, body);
        await context.route(`**/js/crowd/${name}.js*`, (route) =>
          route.fulfill({ contentType: "text/javascript", body }),
        );
      }
    await context.route("**/js/crowd/looks.js*", (route) => {
      report.sourceRequests.push(route.request().url());
      return route.fulfill({ contentType: "text/javascript", body: source });
    });
    if (process.env.AO_THICKNESS) {
      const thickness = Number(process.env.AO_THICKNESS);
      assert.ok(
        Number.isFinite(thickness) && thickness > 0,
        "AO_THICKNESS must be positive",
      );
      const post = fs
        .readFileSync(new URL("../js/post.js", import.meta.url), "utf8")
        .replace(/thickness: [\d.]+,/, `thickness: ${thickness},`);
      report.postOverride = {
        thickness,
        sha256: createHash("sha256").update(post).digest("hex"),
      };
      fs.writeFileSync(`${out}/sources/post.js`, post);
      await context.route("**/js/post.js*", (route) =>
        route.fulfill({ contentType: "text/javascript", body: post }),
      );
    }
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        "amakawa-settings",
        JSON.stringify({
          v: 2,
          privateMode: false,
          voiceOn: false,
          chibi: false,
          textSpeed: "instant",
        }),
      ),
    );
    try {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=plaza&cap&charscale=${scale}&chibi=${["generated", "bridge", "generated-office"].includes(mode) ? 1 : 0}`,
          ),
        "play",
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      report.setup = await page.evaluate(async () => {
        const g = globalThis.__game,
          T = await import("three");
        globalThis.__run = false;
        g.paused = true;
        for (const r of g.place.crowd || []) r.root.visible = false;
        g.player.root.visible = false;
        const benches = [];
        g.place.space.updateMatrixWorld(true);
        g.place.space.traverse((o) => {
          for (const s of o.userData.seats || []) {
            const at = g.place.space.worldToLocal(
              new T.Vector3(s.x, 0.34, s.z).applyMatrix4(o.matrixWorld),
            );
            const forward = g.place.space.worldToLocal(
              new T.Vector3(
                s.x + Math.sin(s.facing),
                0.34,
                s.z + Math.cos(s.facing),
              ).applyMatrix4(o.matrixWorld),
            );
            benches.push({
              at: at.toArray(),
              yaw: Math.atan2(forward.x - at.x, forward.z - at.z),
            });
          }
        });
        globalThis.__bagBench = benches[0];
        return {
          benches,
          gpu: g.renderer.userData.gpu,
          href: globalThis.location.href,
          baseURI: globalThis.document.baseURI,
        };
      });
      const cases =
        mode === "bridge"
          ? [["office", 0]]
          : mode === "generated-office"
            ? [
                ["office", 0],
                ["office", 1],
                ["office", 2],
                ["office", 4],
              ]
            : mode === "fallback"
              ? [
                  ["office", 0],
                  ["office", 1],
                  ["office", 2],
                ]
              : mode === "generated"
                ? [
                    ["casual", 0],
                    ["casual", 2],
                    ["elder", 1],
                  ]
                : [
                    ["office", 0],
                    ["office", 1],
                    ["office", 2],
                    ["casual", 0],
                    ["casual", 2],
                    ["elder", 1],
                  ];
      for (const [kind, index] of cases) {
        if (
          process.env.CASES &&
          !process.env.CASES.split(",").includes(`${kind}-${index}`)
        )
          continue;
        await page.evaluate(
          async ({ kind, index }) => {
            globalThis.__bagRig?.root.removeFromParent();
            const { makeBody } = await import("./js/crowd/looks.js");
            const r = makeBody(kind, index);
            globalThis.__bagRig = r;
            globalThis.__game.place.space.add(r.root);
            globalThis.__bagEnvelope = () => {
              const T = globalThis.__bagThree;
              r.root.updateMatrixWorld(true);
              const inverse = r.root.matrixWorld.clone().invert();
              const point = new T.Vector3();
              let legX = -Infinity,
                lowerBodyX = -Infinity;
              r.model?.traverse((mesh) => {
                if (!mesh.isSkinnedMesh) return;
                const a = mesh.geometry.attributes;
                for (let i = 0; i < a.position.count; i++) {
                  let leg = 0,
                    hip = 0;
                  for (let k = 0; k < 4; k++) {
                    const name =
                      mesh.skeleton.bones[a.skinIndex.getComponent(i, k)]
                        ?.name || "";
                    const weight = a.skinWeight.getComponent(i, k);
                    if (/(?:upleg|leg|foot|toe)/i.test(name)) leg += weight;
                    if (/hips/i.test(name)) hip += weight;
                  }
                  mesh
                    .getVertexPosition(i, point)
                    .applyMatrix4(mesh.matrixWorld)
                    .applyMatrix4(inverse);
                  if (leg >= 0.5) legX = Math.max(legX, point.x);
                  if (leg + hip >= 0.5)
                    lowerBodyX = Math.max(lowerBodyX, point.x);
                }
              });
              const bag = r.root.getObjectByName("crowd-bag"),
                body = bag.children[0];
              body.geometry.computeBoundingBox();
              const box = body.geometry.boundingBox
                .clone()
                .applyMatrix4(inverse.clone().multiply(body.matrixWorld));
              const palm = new T.Vector3()
                .setFromMatrixPosition(bag.parent.matrixWorld)
                .applyMatrix4(inverse);
              const arm = r.model?.getObjectByName("LeftArm");
              const shoulder = arm
                ? new T.Vector3()
                    .setFromMatrixPosition(arm.matrixWorld)
                    .applyMatrix4(inverse)
                : null;
              return {
                legX,
                lowerBodyX,
                bagMin: box.min.toArray(),
                bagMax: box.max.toArray(),
                palm: palm.toArray(),
                shoulder: shoulder?.toArray(),
                reach: shoulder?.distanceTo(palm),
                rootScale: r.root.scale.toArray(),
              };
            };
            globalThis.__bagThree = await import("three");
            globalThis.__bagRestEnvelope = globalThis.__bagEnvelope();
          },
          { kind, index },
        );
        for (const state of process.env.CYCLES_ONLY
          ? []
          : process.env.STATES?.split(",") || [
              "idle",
              "phone",
              "shoe",
              "walk",
              "sit",
              "restore",
            ]) {
          const data = await page.evaluate(async (state) => {
            const T = await import("three"),
              g = globalThis.__game,
              r = globalThis.__bagRig;
            const { standPose, stride, benchSit, idleLife } =
              await import("./js/crowd/motion.js");
            const { stopStep } = await import("./js/crowd/stops.js");
            r.phone?.("");
            r._ph = false;
            standPose(r);
            r.root.position.set(10, 0, -0.3);
            r.root.rotation.y = 0;
            if (state === "restore") {
              const b = globalThis.__bagBench;
              benchSit(r, b.at[0], b.at[2], b.yaw, b.at[1]);
              standPose(r);
              r.root.position.set(10, 0, -0.3);
              r.root.rotation.y = 0;
              for (let i = 0; i < 12; i++) r.update?.(1 / 30);
            }
            if (state === "sit") {
              const b = globalThis.__bagBench;
              benchSit(r, b.at[0], b.at[2], b.yaw, b.at[1]);
            } else if (state === "shoe") {
              const stopped = {
                mode: "shoe",
                t: 0,
                dur: 2.5,
                to: [r.root.position.x, r.root.position.z],
                face: r.root.rotation.y,
                still: false,
              };
              for (let i = 0; i < 30; i++) {
                stopStep({ r, stopped }, 1 / 30, {
                  place: g.place,
                  eric: null,
                  K: 1,
                });
                r.update?.(1 / 30);
              }
            } else if (state === "phone") {
              const idle = {
                r,
                mode: "stand",
                t: 0,
                ph: r.ph,
                phone: true,
                talker: false,
              };
              for (let i = 0; i < 30; i++) {
                idleLife(idle, 1 / 30);
                r.update?.(1 / 30);
              }
            } else if (state === "walk") {
              for (let i = 0; i < 18; i++) {
                stride({ r, kind: r.kind, moved: 0.6, ph: r.ph }, 1 / 30, true);
                r.update?.(1 / 30);
              }
            } else r.update?.(0);
            g.place.scene.updateMatrixWorld(true);
            const hand =
              r.model?.getObjectByName("LeftHand") || r.arms[1].userData.hand;
            const bag = r.root.getObjectByName("crowd-bag");
            if (!bag) throw Error("No hand-held bag for this native body");
            const { legClearance } =
              await import("./tools/crowd-bag-clearance.mjs");
            const legContact = legClearance(T, r, bag)();
            const handle = bag.children[1];
            handle.geometry.computeBoundingBox();
            const grip = handle.geometry.boundingBox
              .getCenter(new T.Vector3())
              .applyMatrix4(handle.matrixWorld);
            const at = hand.getWorldPosition(new T.Vector3());
            const skin = new T.Box3();
            let vertices = 0;
            if (r.model)
              r.model.traverse((o) => {
                if (!o.isSkinnedMesh) return;
                const a = o.geometry.attributes;
                for (let i = 0; i < a.position.count; i++) {
                  let weight = 0;
                  for (let k = 0; k < 4; k++)
                    if (
                      o.skeleton.bones[a.skinIndex.getComponent(i, k)] === hand
                    )
                      weight += a.skinWeight.getComponent(i, k);
                  if (weight < 0.7) continue;
                  skin.expandByPoint(
                    o
                      .getVertexPosition(i, new T.Vector3())
                      .applyMatrix4(o.matrixWorld),
                  );
                  vertices++;
                }
              });
            else skin.setFromObject(hand);
            globalThis.__bagTarget = grip.clone().lerp(at, 0.5);
            return {
              legContact,
              envelope: globalThis.__bagEnvelope(),
              restEnvelope: globalThis.__bagRestEnvelope,
              bagRotation: bag.rotation.toArray(),
              rigId: r.id,
              meshy: !!r.meshy,
              bridge: !!r.bridge,
              base: r.base,
              approved: r.approvedCrowd,
              state,
              supported: bag.parent.parent === r.root,
              seatHeight: g.place.space.localToWorld(
                new T.Vector3(0, globalThis.__bagBench.at[1], 0),
              ).y,
              hand: at.toArray(),
              handle: grip.toArray(),
              gap: grip.distanceTo(at),
              handSkin: {
                min: skin.min.toArray(),
                max: skin.max.toArray(),
                center: skin.getCenter(new T.Vector3()).toArray(),
                vertices,
              },
              bagBounds: {
                min: new T.Box3().setFromObject(bag).min.toArray(),
                max: new T.Box3().setFromObject(bag).max.toArray(),
              },
              root: r.root.position.toArray(),
              rootScale: r.root.scale.toArray(),
            };
          }, state);
          for (const view of ["front", "side"]) {
            await page.evaluate(async (view) => {
              const T = await import("three"),
                g = globalThis.__game,
                r = globalThis.__bagRig;
              const target = globalThis.__bagTarget
                .clone()
                .lerp(
                  r.root
                    .getWorldPosition(new T.Vector3())
                    .add(new T.Vector3(0, 0.5, 0)),
                  0.25,
                );
              const offset = new T.Vector3(
                view === "front" ? 1.1 : 1.7,
                0.45,
                view === "front" ? 1.6 : -0.4,
              ).applyAxisAngle(new T.Vector3(0, 1, 0), r.root.rotation.y);
              g.place.camera.position.copy(target).add(offset);
              g.place.camera.lookAt(target);
              g.place.camera.fov = 38;
              g.place.camera.updateProjectionMatrix();
              g.place.camera.updateMatrixWorld(true);
            }, view);
            await page.waitForTimeout(140);
            if (mode === "bridge") {
              assert.equal(
                data.bridge,
                true,
                "Expected reachable Meshy proxy fallback",
              );
              assert.equal(data.base, "cardigan");
            }
            const id = `${kind}-${index}-${state}-${view}`;
            await page.screenshot({ path: `${out}/${id}.png` });
            report.frames.push({ id, ...data });
          }
        }
        if (process.env.SKIP_CYCLES) continue;
        const cycle = await page.evaluate(async () => {
          const T = await import("three"),
            r = globalThis.__bagRig;
          const { standPose, stride, benchSit, idleLife } =
            await import("./js/crowd/motion.js");
          const { stopStep } = await import("./js/crowd/stops.js");
          const { legClearance } =
            await import("./tools/crowd-bag-clearance.mjs");
          r.phone?.("");
          r._ph = false;
          standPose(r);
          r.root.position.set(10, 0, -0.3);
          r.root.rotation.y = 0;
          const hand =
            r.model?.getObjectByName("LeftHand") || r.arms[1].userData.hand;
          const bag = r.root.getObjectByName("crowd-bag");
          const grip = bag.children[1].geometry.boundingBox.getCenter(
            new T.Vector3(),
          );
          const clearance = legClearance(T, r, bag);
          let legFrames = 0,
            maxLegDepth = 0,
            worstLeg = null,
            legTriangles = 0;
          const point = new T.Vector3(),
            box = new T.Box3(),
            handTravel = new T.Box3();
          let initial,
            maxGripDrift = 0,
            minFloor = Infinity;
          for (let i = 0; i < 270; i++) {
            if (i >= 180) r.root.rotation.y = (((i - 180) / 90) * Math.PI) / 2;
            stride({ r, kind: r.kind, moved: 0.6, ph: r.ph }, 1 / 30, true);
            r.update?.(1 / 30);
            r.root.updateMatrixWorld(true);
            minFloor = Math.min(minFloor, box.setFromObject(bag).min.y);
            const leg = clearance();
            legTriangles = leg.triangleCount;
            if (leg.intersections) legFrames++;
            if (leg.depth > maxLegDepth) {
              maxLegDepth = leg.depth;
              worstLeg = {
                frame: i,
                phase: i < 180 ? "straight" : "turn",
                ...leg,
              };
            }
            if (i < 180) handTravel.expandByPoint(hand.getWorldPosition(point));
            hand.worldToLocal(
              point.copy(grip).applyMatrix4(bag.children[1].matrixWorld),
            );
            initial ??= point.clone();
            maxGripDrift = Math.max(maxGripDrift, initial.distanceTo(point));
          }
          const transitions = [];
          for (const phase of ["phone", "shoe", "sit", "resume"]) {
            const idle = {
              r,
              mode: "stand",
              t: 0,
              ph: r.ph,
              phone: phase === "phone",
              talker: false,
            };
            if (phase !== "phone") {
              r.phone?.("");
              r._ph = false;
            }
            if (phase === "sit") {
              const b = globalThis.__bagBench;
              benchSit(r, b.at[0], b.at[2], b.yaw, b.at[1]);
            } else {
              standPose(r);
              r.root.position.set(10, 0, -0.3);
              r.root.rotation.y = 0.8;
            }
            const stopped = {
              mode: "shoe",
              t: 0,
              dur: 2.5,
              to: [r.root.position.x, r.root.position.z],
              face: r.root.rotation.y,
              still: false,
            };
            for (let frame = 0; frame < 30; frame++) {
              if (phase === "phone") idleLife(idle, 1 / 30);
              if (phase === "shoe")
                stopStep({ r, stopped }, 1 / 30, {
                  place: globalThis.__game.place,
                  eric: null,
                  K: 1,
                });
              if (phase === "resume")
                stride({ r, kind: r.kind, moved: 0.6, ph: r.ph }, 1 / 30, true);
              r.update?.(1 / 30);
              r.root.updateMatrixWorld(true);
              const leg = clearance(),
                supported = bag.parent.parent === r.root;
              const minimum = box.setFromObject(bag).min.y;
              hand.worldToLocal(
                point.copy(grip).applyMatrix4(bag.children[1].matrixWorld),
              );
              const seatTop = globalThis.__game.place.space.localToWorld(
                new T.Vector3(0, globalThis.__bagBench.at[1], 0),
              ).y;
              transitions.push({
                phase,
                frame,
                leg,
                supported,
                minimum,
                seatError: Math.abs(minimum - seatTop),
                gripDrift: initial.distanceTo(point),
              });
            }
          }
          return {
            transitions,
            legFrames,
            maxLegDepth,
            worstLeg,
            legTriangles,
            minFloor,
            maxGripDrift,
            handTravel: handTravel.getSize(new T.Vector3()).length(),
            frames: 270,
            straightFrames: 180,
            turningFrames: 90,
          };
        });
        report.cycles.push({ kind, index, ...cycle });
      }
      assert.deepEqual(report.errors, []);
      for (const frame of report.frames) {
        assert.equal(
          frame.legContact.intersections,
          0,
          `Bag intersects leg in ${frame.id}: ${JSON.stringify(frame.legContact)}`,
        );
        if (frame.supported) {
          assert.equal(
            frame.state,
            "sit",
            `Bag not restored to hand: ${frame.id}`,
          );
          assert.ok(
            Math.abs(frame.bagBounds.min[1] - frame.seatHeight) < 0.002,
            `Bag not supported on seat: ${frame.id}`,
          );
          continue;
        }
        assert.ok(
          frame.bagBounds.min[1] >= 0.005,
          `Bag lacks 5 mm paving clearance: ${frame.id}`,
        );
        for (let axis = 0; axis < 3; axis++)
          assert.ok(
            frame.handle[axis] >= frame.handSkin.min[axis] - 0.01 &&
              frame.handle[axis] <= frame.handSkin.max[axis] + 0.01,
            `Handle outside hand: ${frame.id}`,
          );
      }
      for (const cycle of report.cycles) {
        for (const t of cycle.transitions) {
          const label = `${cycle.kind}-${cycle.index} ${t.phase} frame ${t.frame}`;
          assert.equal(
            t.leg.intersections,
            0,
            `Leg intersection during ${label}: ${JSON.stringify(t.leg)}`,
          );
          assert.equal(
            t.supported,
            t.phase === "sit",
            `Seat/hand restoration failed: ${label}`,
          );
          if (t.supported)
            assert.ok(t.seatError < 0.002, `Seat support failed: ${label}`);
          else {
            assert.ok(t.gripDrift < 0.00001, `Carrying grip drift: ${label}`);
            assert.ok(
              t.minimum >= 0.005,
              `Carrying bag lacks 5 mm paving clearance: ${label}`,
            );
          }
        }
        assert.equal(
          cycle.legFrames,
          0,
          `Bag intersects posed leg surface: ${JSON.stringify(cycle)}`,
        );
        assert.ok(
          cycle.maxGripDrift < 0.00001,
          `Grip drift: ${JSON.stringify(cycle)}`,
        );
        assert.ok(
          cycle.handTravel > 0.01,
          `Stalled gait: ${JSON.stringify(cycle)}`,
        );
        assert.ok(
          cycle.minFloor >= 0.005,
          `Bag crosses paving: ${JSON.stringify(cycle)}`,
        );
      }
      report.passed = true;
      console.log(
        JSON.stringify({ frames: report.frames.length, errors: report.errors }),
      );
    } catch (error) {
      report.passed = false;
      report.failure = error.stack;
      throw error;
    } finally {
      closing = true;
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 285000 },
);
