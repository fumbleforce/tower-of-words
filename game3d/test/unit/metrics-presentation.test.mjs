import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function metricsFixture() {
  const callbacks = [];
  let hidden = false;
  const info = {
    autoReset: true,
    render: { calls: 47, triangles: 100 },
    memory: { geometries: 1, textures: 1 },
    reset() { this.render.calls = this.render.triangles = 0; },
  };
  const win = { addEventListener() {} };
  const game = {
    renderer: { info, userData: {} },
    place: { name: 'office' },
    player: { root: { position: { x: 0, z: 0 } } },
    view: { presentations: 0, draws: 0, worldHidden: () => hidden },
  };
  const source = fs.readFileSync(new URL('../../js/perf/metrics.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export function installMetrics', 'function installMetrics');
  const context = vm.createContext({
    settings: { perfOverlay: false },
    setSetting() {},
    followHud() {},
    window: win,
    location: { search: '?perf' },
    document: { body: { classList: { contains: () => false } } },
    URLSearchParams,
    innerWidth: 1366,
    innerHeight: 860,
    requestAnimationFrame: callback => callbacks.push(callback),
  });
  vm.runInContext(`${source}\nthis.install = installMetrics;`, context);
  context.install(game);
  let now = 0;
  return {
    info, win,
    cover(value) { hidden = value; },
    tick() {
      now += 1000 / 60;
      game.view.presentations++;
      if (!hidden) game.view.draws++;
      const callback = callbacks.shift();
      assert.equal(typeof callback, 'function');
      callback(now);
    },
    frames: () => win.__perfReport().places.office.frames,
  };
}

test('a held diagnostic sampler keeps manual counters when an armed visible frame becomes covered', () => {
  const f = metricsFixture();
  for (let frame = 0; frame < 10; frame++) f.tick();
  assert.equal(f.info.autoReset, false, 'metrics armed its tenth-frame sample');
  f.win.__perfHold = true;
  f.info.render.calls = 73;
  f.cover(true);
  f.tick();
  assert.equal(f.info.autoReset, false, 'the tool now owns reset behavior');
  assert.equal(f.info.render.calls, 73, 'metrics leaves the held counters alone');
  f.cover(false);
  f.tick();
  assert.equal(f.info.autoReset, false, 'revealing the world also respects the tool hold');
});

test('ordinary cover clears an armed sample and DOM frames never enter world frame budgets', () => {
  const f = metricsFixture();
  for (let frame = 0; frame < 10; frame++) f.tick();
  assert.equal(f.info.autoReset, false);
  const before = f.frames();
  f.cover(true);
  for (let frame = 0; frame < 30; frame++) f.tick();
  assert.equal(f.info.autoReset, true, 'ordinary hidden frames restore normal renderer resetting');
  assert.equal(f.frames(), before, 'DOM-only presentations are excluded from world budgets');
  f.cover(false);
  f.tick();
  f.tick();
  assert.equal(f.frames(), before + 1, 'world samples resume without counting the cover gap');
});
