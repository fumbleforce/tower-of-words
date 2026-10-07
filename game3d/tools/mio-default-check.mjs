// Native staging and sustained motion of the selected default. Close cameras are diagnostic only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/mio-default/${process.env.OUT || 'round1'}-${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], cases: [] };
await withBrowserJob('mio-default-' + width, async (browser) => {
  const context = await browser.newContext({ viewport: { width, height } });
  let closing = false;
  await context.route(
    '**/*',
    scopedRoute({
      publicOnly: true,
      isClosing: () => closing,
      onFailure: (e) => report.errors.push(e),
    }),
  );
  await context.addInitScript(() =>
    globalThis.localStorage.setItem(
      'amakawa-settings',
      JSON.stringify({
        privateMode: false,
        voiceOn: false,
        textSpeed: 'instant',
      }),
    ),
  );
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  const shot = (id) => page.screenshot({ path: out + id + '.png' });
  async function detail(side = false) {
    await page.evaluate(async (side) => {
      const g = globalThis.__game,
        T = await import('three'),
        m = g.mioNpc;
      globalThis.__run = false;
      g.paused = true;
      m.root.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(m.root),
        target = box.getCenter(new T.Vector3());
      const camera = g.place.camera || g.place.cam.camera;
      const yaw = m.root.getWorldQuaternion(new T.Quaternion());
      camera.position.copy(target).add(new T.Vector3(side ? 1.6 : 0.8, 0.5, side ? 0.8 : 1.7).applyQuaternion(yaw));
      camera.lookAt(target);
      camera.fov = 42;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }, side);
    await page.waitForTimeout(150);
  }
  try {
    for (const place of (process.env.PLACES || 'train,office,forecourt').split(',')) {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?cap&place=${place}&day=${place === 'office' ? 2 : 1}&q=2${process.env.QS || ''}`,
          ),
        'play',
      );
      await page.waitForFunction(() => globalThis.__done);
      await page.evaluate(() => {
        globalThis.__run = true;
        const g = globalThis.__game;
        if (g.place.name === 'office') {
          g.flagsRef.d2_ticket_done = true;
          g.place.hooks.officeDay2({ state: 'arrive' });
        }
      });
      await page.waitForTimeout(1000);
      const info = await page.evaluate(async () => {
        const g = globalThis.__game,
          m = g.mioNpc,
          T = await import('three');
        const b = new T.Box3().setFromObject(m.root);
        return {
          place: g.place.name,
          id: m.id,
          visible: m.root.visible,
          seated: m.seated,
          size: b.getSize(new T.Vector3()).toArray(),
          phoneTracks: m.layers?.layers?.phone?.pose.length || 0,
          contacts: m.workContacts,
        };
      });
      if (place === 'train' && process.env.SAVE_TRAIN) {
        const world = await page.evaluate(() => globalThis.__game.place.snapshotState());
        fs.writeFileSync(process.env.SAVE_TRAIN, JSON.stringify(world, null, 2));
      }
      report.cases.push(info);
      if (process.env.QS?.includes('mio=legacy')) assert.notEqual(info.id, 'mio2');
      else {
        assert.equal(info.id, 'mio2');
        assert.equal(info.phoneTracks, 13);
        if (place !== 'forecourt') {
          assert.equal(info.contacts?.length, 2, 'both working wrists must be measured');
          for (const contact of info.contacts) assert(contact.gap < 0.025, 'keyboard wrist gap ' + contact.gap);
        }
      }
      if (place === 'office' || place === 'train') assert.equal(info.seated, true);
      await shot(place + '-arrival');
      if (place !== 'forecourt') {
        await detail();
        await shot(place + '-detail');
        await detail(true);
        await shot(place + '-side');
        if (place === 'train' && info.id === 'mio2') {
          info.savedLaptop = await page.evaluate(
            async (savedWorld) => {
              const g = globalThis.__game,
                T = await import('three'),
                P = g.place,
                m = g.mioNpc;
              const laptop = P.space.getObjectByName('train-laptop');
              const before = laptop.position.clone(),
                seatBefore = m.root.position.clone(),
                world = savedWorld || P.snapshotState();
              if (!savedWorld) world.props.laptop.position = [2.1, 0.42, -0.66]; // pre-integration car-space save
              P.restoreState({ flags: g.flagsRef, world });
              g.paused = false;
              globalThis.__run = true;
              await g.wait(150);
              const restoredGap = laptop.position.distanceTo(before),
                seatGap = m.root.position.distanceTo(seatBefore);
              const restoredPosition = m.root.position.toArray();
              let hiddenPreserved = null,
                selectedPoseGap = null;
              if (savedWorld) {
                const hidden = structuredClone(savedWorld);
                hidden.people.mio.visible = false;
                if (hidden.sunday?.people?.mio) hidden.sunday.people.mio.visible = false;
                P.restoreState({ flags: g.flagsRef, world: hidden });
                await g.wait(100);
                hiddenPreserved = !m.root.visible;
                m.root.visible = true;
                m.root.position.x += 0.035;
                const selected = P.snapshotState(),
                  selectedAt = m.root.position.clone();
                P.restoreState({ flags: g.flagsRef, world: selected });
                await g.wait(100);
                selectedPoseGap = m.root.position.distanceTo(selectedAt);
              }
              await g.hooks.stand({ who: 'mio' });
              await g.wait(150);
              const at = laptop.getWorldPosition(new T.Vector3());
              const parent = laptop.parent;
              const probe = new T.Group();
              P.space.add(probe);
              probe.attach(m.root);
              m.root.position.x += 1;
              m.root.updateMatrixWorld(true);
              const follows = laptop.getWorldPosition(new T.Vector3()).distanceTo(at);
              return {
                restoredGap,
                seatGap,
                savedPosition: world.people.mio.position,
                nativePosition: seatBefore.toArray(),
                restoredPosition,
                hiddenPreserved,
                selectedPoseGap,
                peopleId: P.people.mio.id,
                legacyPayload: !!savedWorld,
                follows,
                attachedToMio: parent === m.root,
                seated: m.seated,
              };
            },
            process.env.LOAD_TRAIN ? JSON.parse(fs.readFileSync(process.env.LOAD_TRAIN, 'utf8')) : null,
          );
          if (process.env.LOAD_TRAIN) {
            assert.equal(info.savedLaptop.hiddenPreserved, true);
            assert(info.savedLaptop.selectedPoseGap < 0.001, 'selected save should retain its authored position');
          }
          assert(info.savedLaptop.seatGap < 0.001, 'saved actor root does not match native seat support');
          assert(info.savedLaptop.restoredGap < 0.01, 'legacy car-space laptop save moved the supported prop');
          assert.equal(info.savedLaptop.follows, 0, 'laptop followed Mio across a place boundary');
          assert.equal(info.savedLaptop.attachedToMio, false);
          assert.equal(info.savedLaptop.seated, false);
        }
        continue;
      }
      await page.evaluate(async () => {
        const g = globalThis.__game,
          m = g.mioNpc;
        const { reachableNear } = await import('./js/movement/navigation.js');
        const p = g.player.root.position;
        const at = reachableNear(g.place.nav, p.x, p.z, p.x + 1.1, p.z + 1);
        g.place.space.add(m.root);
        m.root.visible = true;
        m.stand?.();
        m.seated = false;
        m.root.position.set(at[0], 0, at[1]);
        m.root.rotation.y = 0;
        m.setState('idle');
      });
      await page.evaluate(() => globalThis.__game.mioNpc.phone('look'));
      await detail();
      await shot('phone-front');
      await detail(true);
      await shot('phone-side');
      info.phone = await page.evaluate(async () => {
        const g = globalThis.__game,
          m = g.mioNpc,
          T = await import('three');
        const hand = m.model.getObjectByName('RightHand'),
          other = m.model.getObjectByName('LeftHand');
        const prop = hand.children.find((o) => o.isGroup && o.userData.k);
        return {
          visible: prop?.visible,
          handGap: hand.getWorldPosition(new T.Vector3()).distanceTo(other.getWorldPosition(new T.Vector3())),
          phone: prop?.getWorldPosition(new T.Vector3()).toArray(),
          right: hand.getWorldPosition(new T.Vector3()).toArray(),
          left: other.getWorldPosition(new T.Vector3()).toArray(),
        };
      });
      assert.equal(info.phone.visible, true);
      await page.evaluate(async () => {
        const g = globalThis.__game;
        g.paused = false;
        globalThis.__run = true;
        await g.mioNpc.phone('away');
      });
      const motion = await page.evaluate(async () => {
        const g = globalThis.__game,
          m = g.mioNpc,
          T = await import('three');
        const { walkRig } = await import('./js/move.js');
        const { reachableNear } = await import('./js/movement/navigation.js');
        const start = m.root.position.clone(),
          samples = [];
        let phase = 'walk';
        const sample = () => {
          m.root.updateMatrixWorld(true);
          samples.push({
            time: g.t,
            phase,
            root: m.root.position.toArray(),
            state: m.state,
            leg: m.model.getObjectByName('LeftLeg').quaternion.toArray(),
            foot: m.model.getObjectByName('LeftFoot').getWorldPosition(new T.Vector3()).toArray(),
          });
        };
        const timer = setInterval(sample, 80);
        try {
          for (const run of [false, true]) {
            phase = run ? 'run' : 'walk';
            const end = reachableNear(g.place.nav, m.root.position.x, m.root.position.z, start.x + 4, start.z);
            await walkRig(g, m, end, { run, speed: run ? 2 : 1.1 });
            await walkRig(g, m, [start.x, start.z], {
              run,
              speed: run ? 2 : 1.1,
            });
          }
        } finally {
          clearInterval(timer);
        }
        return samples;
      });
      info.motion = motion;
      assert(motion.length > 60, 'sustained motion samples missing');
      const xs = motion.map((s) => s.root[0]);
      assert(Math.max(...xs) - Math.min(...xs) > 2, 'Mio did not cross the ground');
      for (const phase of ['walk', 'run']) {
        const samples = motion.filter((s) => s.phase === phase),
          late = samples.slice(Math.floor(samples.length / 2));
        assert(samples.length > 25, phase + ' coverage too short');
        assert(
          late.some((s) => Math.abs(s.leg[0] - late[0].leg[0]) > 0.04),
          phase + ' leg stopped after its first step',
        );
      }
      await page.waitForTimeout(600);
      await detail();
      await shot('after-motion');
    }
    assert.deepEqual(report.errors, []);
    console.log('PASS native default Mio', width, out);
  } finally {
    fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
    closing = true;
    await context.close();
  }
});
