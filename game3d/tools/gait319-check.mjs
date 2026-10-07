// Public native diagnostic: retain every simulation step and drawn sample around office gait failures.
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { openGame } from '../test/support/open-game.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d',
  out = `game3d/shots/gait319/${process.env.TAG || new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'gait319-trace',
  async (browser) => {
    const routeErrors = [];
    const { page, context, errors } = await openGame(browser, {
      viewport: { width, height },
      mode: 'fast',
      url: `http://127.0.0.1:8771/${base}/index.html?test=fast&q=0&mc=${process.env.MC || 'eric'}`,
      beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => routeErrors.push(e) }));
        await page.addInitScript(() =>
          globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
        );
      },
    });
    try {
      if (process.env.THROTTLE) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE });
      }
      await page.evaluate(async () => {
        const T = await import('three'),
          g = globalThis.__game,
          r = g.player,
          trace = (globalThis.__gait319 = { steps: [], drawn: [] }),
          feet = [];
        r.model.traverse((o) => {
          if (o.isBone && /(left|right).*foot$/i.test(o.name.replace(/[^a-z]/gi, ''))) feet.push(o);
        });
        const snapshot = () => {
          r.root.updateWorldMatrix(true, true);
          return {
            t: g.t,
            place: g.place.name,
            at: r.root.position.toArray(),
            parent: r.root.parent.uuid,
            scale: r.root.scale.x,
            state: r.state,
            seated: r.seated,
            scripted: r.scripted,
            walk: r._walk,
            busy: g.busy,
            node: g.runner.currentNode,
            goal: g.ui.goalText,
            walker: {
              v: g.walker.v,
              moving: g.walker.moving,
              gait: { ...g.walker.gait },
              path: g.walker.path?.map((p) => [...p]),
            },
            gait: { ...r._gait },
            feet: feet.map((f) => r.root.worldToLocal(f.getWorldPosition(new T.Vector3())).toArray()),
            actions: r.mixer._actions
              .filter((a) => a.isScheduled())
              .map((a) => ({
                name: a.getClip().name,
                time: a.time,
                weight: a.getEffectiveWeight(),
                scale: a.getEffectiveTimeScale(),
                enabled: a.enabled,
                paused: a.paused,
              })),
          };
        };
        const update = r.update;
        r.update = function (dt, ...args) {
          const result = update.call(this, dt, ...args);
          if (g.place?.name === 'office') trace.steps.push({ ...snapshot(), dt });
          return result;
        };
        const drawn = () => {
          if (g.place?.name === 'office') trace.drawn.push(snapshot());
          if (!globalThis.__test.done) globalThis.requestAnimationFrame(drawn);
        };
        globalThis.requestAnimationFrame(drawn);
      });
      await page.waitForFunction(() => globalThis.__test?.done, null, { timeout: 220000 });
      const result = await page.evaluate(() => ({
        trace: globalThis.__gait319,
        gait: globalThis.__gaitCheck,
        test: globalThis.__test,
      }));
      fs.writeFileSync(
        out + '/trace.json',
        JSON.stringify({ result, errors: [...errors, ...routeErrors], throttle: +process.env.THROTTLE || 1 }),
      );
      await page.screenshot({ path: out + '/end.png' });
      console.log(
        JSON.stringify({
          out,
          errors,
          steps: result.trace.steps.length,
          drawn: result.trace.drawn.length,
          episodes: result.gait.episodes,
        }),
      );
    } finally {
      if (!fs.existsSync(out + '/trace.json')) {
        const partial = await page
          .evaluate(() => ({ trace: globalThis.__gait319, gait: globalThis.__gaitCheck, test: globalThis.__test }))
          .catch(() => null);
        fs.writeFileSync(out + '/partial.json', JSON.stringify({ partial, errors: [...errors, ...routeErrors] }));
      }
      await context.close();
    }
  },
  { timeoutMs: 270000 },
);
