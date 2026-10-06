// Actual public Runner branches, including title Continue from water and a bench.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import routes from '../test/routes/day3.mjs';
import { runRoute } from '../test/routes/driver.mjs';
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`;
const out = process.env.OUT || 'game3d/shots/pool-staging';
fs.mkdirSync(out, { recursive: true });
const width = +(process.argv[2] || 390), height = +(process.argv[3] || 844);
const mc = process.env.MC || (width < 600 ? 'carina' : 'eric');
const reports = [], poses = [];
await withBrowserJob('pool-runner-staging', async browser => {
  const recording = {
    async newContext(options) {
      const context = await browser.newContext(options);
      const newPage = context.newPage.bind(context);
      context.newPage = async () => {
        const page = await newPage();
        await page.exposeBinding('__poolFrame', async (_, node) => {
          await page.waitForFunction(() => !!globalThis.__game?.ui?._advance, null, { timeout: 10000 });
          await page.waitForTimeout(900);
          await page.screenshot({ path: `${out}/${width}-${mc}-${node}.png` });
          const state = await page.evaluate(() => {
            const g = globalThis.__game;
            return { node: g.runner.currentNode, world: g.place.snapshotState(), scripted: g.player.scripted,
              seated: g.player.seated, player: g.player.root.position.toArray(), period: g.sim.period };
          });
          poses.push(state);
        });
        await page.addInitScript(() => {
          const seen = new Set();
          const timer = setInterval(() => {
            const g = globalThis.__game;
            if (!g?.ui?.say) return;
            clearInterval(timer);
            const say = g.ui.say;
            g.ui.say = async function (...args) {
              const node = g.runner.currentNode;
              if (!['club_swimming_pool', 'club_swimming_length', 'club_swimming_sit'].includes(node) || seen.has(node))
                return say.apply(this, args);
              seen.add(node);
              const auto = this.auto; this.auto = false;
              const pending = say.apply(this, args);
              await new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)));
              await globalThis.__poolFrame(node);
              this.auto = auto;
              if (auto) this._advance?.();
              return pending;
            };
          }, 20);
        });
        return page;
      };
      return context;
    },
  };
  for (const resumeAt of process.env.RESUME_AT ? [process.env.RESUME_AT] : ['club_swimming_length', 'club_swimming_sit']) {
    const route = structuredClone(routes.find(r => r.id === 'd3-pool-swim-sit'));
    route.id += `-${resumeAt}-continue`;
    route.resumeAt = resumeAt;
    route.expect.nodes = resumeAt === 'club_swimming_length' ? [resumeAt, 'club_swimming_sit'] : [resumeAt];
    reports.push(await runRoute(recording, route, { base, viewport: { width, height }, who: { mc } }));
  }
}, { timeoutMs: 280000, gpuWaitMs: 180000 });
fs.writeFileSync(`${out}/${width}-${mc}-report.json`, JSON.stringify({ reports, poses }, null, 2));
assert.ok(reports.every(r => r.pass), JSON.stringify(reports));
assert.ok(poses.some(p => p.node === 'club_swimming_length' && p.scripted && p.player[1] < 0), 'water pose captured');
assert.ok(poses.some(p => p.node === 'club_swimming_sit' && p.seated && p.world.player.eric.seatOut), 'bench pose captured');
for (const p of poses.filter(p => p.node === 'club_swimming_length')) {
  assert.equal(p.world.swim.camera?.shot.elev, .48, 'owned water framing survives actual Runner Continue');
  const actor = p.world.player.eric, target = p.world.people.kuro.position;
  const expected = Math.atan2(target[0] - actor.position[0], target[2] - actor.position[2]);
  assert.ok(Math.cos(actor.rotation[1] - expected) > .98, 'scripted swimmer faces Kuro while the walking controller is paused');
}
console.log(`PASS ${width} ${mc}: ${reports.length} title Continue case(s), water and bench actual Runner frames`);
