import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const out = new URL(
  `../shots/office-people/${new Date().toISOString().replaceAll(':', '-')}-${process.pid}/`,
  import.meta.url,
).pathname;
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d',
  expected = {
    worker_a: 'b',
    worker_b: 'a',
    commuter_1: 'a',
    commuter_2: 'a',
    commuter_3: 'a',
    sales1: 'a',
    sales2: 'b',
  };
await withBrowserJob(
  'office-people-route-' + width,
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 600,
      hasTouch: width < 600,
      serviceWorkers: 'block',
    });
    let closing = false;
    const errors = [],
      rows = [],
      seen = new Set(),
      shots = new Set();
    let rode = false,
      arrived = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }),
    );
    await context.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await waitForGame(
        page,
        60000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&ts=3&place=gate&q=0`),
        'play',
      );
      for (let i = 0; i < 1000; i++) {
        const row = await page.evaluate(() => {
          const p = globalThis.__game.place,
            lift = globalThis.__lift;
          return {
            place: p.name,
            ride: !!lift?.ride.on,
            floor: globalThis.__game.liftFloor || lift?.ride.floor,
            people: Object.entries({ ...p.extras, ...p.people })
              .filter(([id]) => /^(worker_|commuter_|sales)/.test(id))
              .map(([id, r]) => ({
                id,
                approved: r.approvedCrowd,
                visible: r.root.visible,
                bridge: r.bridge,
                ph: r.ph,
                finite:
                  r.root.children.every((o) => o.position.toArray().every(Number.isFinite)) &&
                  Number.isFinite(r.torso.scale.y),
              })),
            commuters: p._commuters?.map((c) => ({
              stage: c.stage,
              arm: c.r.arms[0].rotation.toArray().slice(0, 3),
              left: c.r.arms[1].rotation.toArray().slice(0, 3),
            })),
          };
        });
        rows.push(row);
        for (const r of row.people) {
          assert.equal(r.approved, expected[r.id], r.id + ' model');
          assert.equal(r.bridge, true, r.id + ' bridge');
          assert.ok(Number.isFinite(r.ph) && r.finite, r.id + ' finite pose');
          if (r.visible) seen.add(r.id);
        }
        const keys = [];
        if (row.place === 'gate') {
          if (i === 0) keys.push('gate-native');
          for (const phase of ['queue', 'tap', 'through'])
            if (row.commuters?.some((c) => c.stage === phase)) keys.push('gate-' + phase);
        }
        if (row.ride) {
          rode = true;
          keys.push('ride-' + String(row.floor).replaceAll('-', ''));
        }
        for (const key of keys)
          if (!shots.has(key)) {
            shots.add(key);
            await page.screenshot({ path: out + width + '-' + key + '.png' });
          }
        if (rode && row.place === 'office' && !row.ride) {
          arrived = true;
          await page.screenshot({ path: out + width + '-arrived-office.png' });
          break;
        }
        await page.waitForTimeout(150);
      }
      const privateMode = await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('amakawa-settings')).privateMode);
      fs.writeFileSync(
        out + width + '-report.json',
        JSON.stringify(
          { base, expected, seen: [...seen], rode, arrived, shots: [...shots], rows, errors, privateMode },
          null,
          2,
        ),
      );
      assert.deepEqual([...seen].sort(), Object.keys(expected).sort(), 'seven visible roles');
      assert.ok(rode && arrived, 'actual lift completed');
      assert.ok(shots.has('gate-tap') && shots.has('gate-through'), 'tap then passage');
      assert.deepEqual(errors, []);
      assert.equal(privateMode, false);
      console.log('PASS seven approved office roles and actual gate/lift route ' + width + '; evidence ' + out);
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 260000 },
);
