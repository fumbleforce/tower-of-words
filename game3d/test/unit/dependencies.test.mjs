import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dependencyGraph, cyclicEdges, checkCycleBaseline } from '../../../tools/check/dependencies.mjs';

const fixture = sources => ({ read: file => sources[file], exists: file => Object.hasOwn(sources, file) });

test('dependency resolution includes static, re-export and literal dynamic imports', () => {
  const sources = {
    'game3d/js/a.js': "import './b.js'; export { x } from './c.js'; import(`./d.js`);",
    'game3d/js/b.js': "import './a.js';", 'game3d/js/c.js': 'export const x = 1;',
    'game3d/js/d.js': "import './b.js';",
  };
  const { graph } = dependencyGraph(['game3d/js/a.js'], fixture(sources));
  assert.deepEqual(graph['game3d/js/a.js'], ['game3d/js/b.js', 'game3d/js/c.js', 'game3d/js/d.js']);
  const baseline = { edges: ['game3d/js/a.js -> game3d/js/b.js', 'game3d/js/b.js -> game3d/js/a.js'] };
  assert.deepEqual(checkCycleBaseline(graph, baseline), ['game3d/js/a.js -> game3d/js/d.js', 'game3d/js/d.js -> game3d/js/b.js']);
  assert.equal(cyclicEdges(graph).length, 4);
});

test('Three import-map aliases resolve to real vendor files and typos fail', () => {
  const sources = { 'game3d/js/a.js': "import 'three'; import 'three/addons/math/ConvexHull.js';",
    'game3d/vendor/three/three.module.js': '', 'game3d/vendor/math/ConvexHull.js': '' };
  assert.deepEqual(dependencyGraph(['game3d/js/a.js'], fixture(sources)).graph['game3d/js/a.js'], []);
  delete sources['game3d/vendor/math/ConvexHull.js'];
  assert.throws(() => dependencyGraph(['game3d/js/a.js'], fixture(sources)), /unresolved import/);
  sources['game3d/js/a.js'] = "import './misspelled.js';";
  assert.throws(() => dependencyGraph(['game3d/js/a.js'], fixture(sources)), /unresolved import/);
});

test('nonliteral imports are reported and private/outside paths reject before filesystem access', () => {
  const source = 'const load = name => import(name);';
  const result = dependencyGraph(['game3d/js/a.js'], fixture({ 'game3d/js/a.js': source }));
  assert.deepEqual(result.dynamic, [{ file: 'game3d/js/a.js', expression: 'name' }]);
  for (const specifier of ['../../../outside.js', '../../private/user/secret.js',
    'three/addons/../../../outside.js', 'three/addons/../js/cycle.js']) {
    assert.throws(() => dependencyGraph(['game3d/js/a.js'], {
      read: () => `import '${specifier}';`, exists: () => { throw new Error('must not inspect'); },
    }), /outside public sources/);
  }
});

test('removed cycles must also retire their allowance', () => {
  assert.match(checkCycleBaseline({ a: [], b: [] }, { edges: ['a -> b'] })[0], /Remove resolved cycle allowance/);
});

test('runtime imports cannot cross into tools or archived code', () => {
  for (const specifier of ['../../tools/x.js', '../../legacy/y.js'])
    assert.throws(() => dependencyGraph(['game3d/js/a.js'], {
      read: () => `import '${specifier}';`, exists: () => { throw new Error('must not inspect'); },
    }), /runtime import outside runtime sources/);
});
