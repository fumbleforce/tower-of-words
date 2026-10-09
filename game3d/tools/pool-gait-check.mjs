// Trace the active and cached feet through the actual day-three pool clothing changes.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
import { fastResult } from '../test/support/fast-result.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d';
const out = path.resolve(process.env.OUT || `game3d/shots/gait350/${Date.now()}`);
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'pool-gait-trace',
  async (browser) => {
    const scopeErrors = [];
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !/^Failed to load resource:.*404/.test(message.text()))
        errors.push(message.text());
    });
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => scopeErrors.push(e) }));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
    );
    try {
      await waitForGame(
        page,
        60000,
        async () => {
          const response = await page.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&q=0&day=3&mc=eric`);
          if (!response?.ok()) throw new Error(`Game HTTP ${response?.status()}`);
        },
        'fast',
      );
      await page.evaluate(async () => {
        const T = await import('three'),
          g = globalThis.__game,
          trace = (globalThis.__poolGait = { samples: [], models: [] });
        let model,
          currentFeet = [];
        const C = globalThis.__gaitCheck,
          sample = C.sample;
        const v = new T.Vector3();
        const belongs = (bone, root) => {
          for (let o = bone; o; o = o.parent) if (o === root) return true;
          return false;
        };
        C.sample = function (clock = 'step') {
          const result = sample.call(this, clock),
            r = g.player;
          if (g.place?.name !== 'pool') return result;
          if (model !== r.model) {
            model = r.model;
            currentFeet = [];
            model?.traverse((o) => {
              if (o.isBone && /(left|right).*foot$/i.test(o.name.replace(/[^a-z]/gi, ''))) currentFeet.push(o);
            });
            trace.models.push({
              t: g.t,
              model: model?.uuid,
              feet: currentFeet.map((f) => f.uuid),
            });
          }
          const relative = (feet) => (feet || []).map((f) => r.root.worldToLocal(f.getWorldPosition(v)).toArray());
          r.root.updateWorldMatrix(true, true);
          trace.samples.push({
            t: g.t,
            clock,
            root: r.root.position.toArray(),
            scale: r.root.scale.x,
            parent: r.root.parent?.uuid,
            sat: r._gwSat,
            yaw: r.root.rotation.y,
            model: model?.uuid,
            current: relative(currentFeet),
            cached: relative(r._gaitFeet),
            cachedAttached: (r._gaitFeet || []).every((f) => belongs(f, r.root)),
            sameFeet: currentFeet.length === r._gaitFeet?.length && currentFeet.every((f) => r._gaitFeet.includes(f)),
            state: r.state,
            scripted: !!r.scripted,
            seated: !!r.seated,
            swimming: !!r.swimming,
            walk: !!r._walk,
            busy: !!g.busy,
            node: g.runner.currentNode,
            walker: { v: g.walker.v, gait: { ...g.walker.gait } },
            episodes: C.episodes.length,
          });
          return result;
        };
      });
      await page.waitForFunction(() => globalThis.__game?.place?.name === 'pool', null, { timeout: 180000 });
      await page.screenshot({ path: path.join(out, 'pool-entry.png') });
      await page.waitForFunction(() => globalThis.__poolGait?.models.length >= 2 || globalThis.__test?.done, null, {
        timeout: 90000,
      });
      await page.screenshot({ path: path.join(out, 'pool-outfit.png') });
      await page.waitForFunction(() => globalThis.__test?.done, null, {
        timeout: 90000,
      });
      const result = await page.evaluate(() => ({
        trace: globalThis.__poolGait,
        episodes: globalThis.__gaitCheck.episodes,
        run: {
          ...globalThis.__test,
          ended: !!globalThis.__ended,
          move: globalThis.__moveCheck,
          gait: {
            long: globalThis.__gaitCheck.reports(4),
            short: globalThis.__gaitCheck.reports(2).length,
            windows: globalThis.__gaitCheck.windows,
          },
        },
      }));
      const verdict = fastResult(result.run, [...errors, ...scopeErrors], {});
      fs.writeFileSync(path.join(out, 'trace.json'), JSON.stringify({ base, width, ...result, verdict }, null, 2));
      await page.screenshot({ path: path.join(out, 'end.png') });
      console.log(
        JSON.stringify(
          {
            out,
            verdict,
            models: result.trace.models,
            wrongFeet: result.trace.samples.filter((s) => !s.sameFeet).length,
            episodes: result.episodes,
          },
          null,
          2,
        ),
      );
      if (!verdict.pass) process.exitCode = 1;
    } catch (error) {
      const partial = await page
        .evaluate(() => ({
          trace: globalThis.__poolGait,
          episodes: globalThis.__gaitCheck?.episodes,
          run: globalThis.__test,
        }))
        .catch(() => null);
      fs.writeFileSync(
        path.join(out, 'interrupted.json'),
        JSON.stringify({ base, width, error: error.message, errors, scopeErrors, partial }, null, 2),
      );
      throw error;
    } finally {
      await context.close();
    }
  },
  { timeoutMs: 295000 },
);
