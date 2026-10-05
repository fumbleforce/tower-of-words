import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import madge from 'madge';
import { parseSource, visitSource } from '../lib/source-data.mjs';
import { sourceFiles } from './source-files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const external = new Set(['https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js']);

export function dependencyGraph(files, { read = file => fs.readFileSync(path.join(root, file), 'utf8'),
  exists = file => fs.existsSync(path.join(root, file)) } = {}) {
  const graph = {}, dynamic = [];
  function resolve(from, specifier) {
    if (external.has(specifier)) return null;
    let target;
    if (specifier === 'three') target = 'game3d/vendor/three/three.module.js';
    else if (specifier.startsWith('three/addons/')) {
      const addon = specifier.slice('three/addons/'.length);
      assert(!addon.split('/').some(part => ['..', 'private'].includes(part)), `${from}: import outside public sources`);
      target = path.posix.normalize('game3d/vendor/' + addon);
    }
    else if (specifier.startsWith('.')) target = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
    else throw new Error(`${from}: unsupported import ${specifier}`);
    assert(!target.startsWith('../') && !target.split('/').includes('private'), `${from}: import outside public sources`);
    // game3d/data/: plain JSON the code imports (`with { type: 'json' }`), a leaf of the graph
    assert(['game3d/js/', 'game3d/story/', 'game3d/vendor/'].some(prefix => target.startsWith(prefix))
      || (target.startsWith('game3d/data/') && target.endsWith('.json')),
      `${from}: runtime import outside runtime sources (${target})`);
    assert(exists(target), `${from}: unresolved import ${specifier} (${target})`);
    return target.startsWith('game3d/vendor/') || target.startsWith('game3d/data/') ? null : target;
  }
  const visit = file => {
    if (Object.hasOwn(graph, file)) return;
    graph[file] = [];
    visitSource(parseSource(read(file)), node => {
      let source;
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)) source = node.source;
      if (!source) return;
      const specifier = source.type === 'Literal' ? source.value
        : source.type === 'TemplateLiteral' && !source.expressions.length ? source.quasis[0].value.cooked : null;
      if (typeof specifier !== 'string') {
        dynamic.push({ file, expression: read(file).slice(...source.range) });
        return;
      }
      const target = resolve(file, specifier);
      if (target && !graph[file].includes(target)) graph[file].push(target);
    });
    graph[file].sort().forEach(visit);
  };
  files.forEach(visit);
  return { graph: Object.fromEntries(Object.entries(graph).sort(([a], [b]) => a.localeCompare(b))), dynamic };
}

// Every edge inside a cycle matters. A DFS cycle list alone can omit a second route through a component.
export function cyclicEdges(graph) {
  const reaches = (from, target, seen = new Set()) => {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return (graph[from] || []).some(next => reaches(next, target, seen));
  };
  return Object.entries(graph).flatMap(([file, imports]) => imports.filter(target => reaches(target, file))
    .map(target => `${file} -> ${target}`)).sort();
}

export function checkCycleBaseline(graph, baseline) {
  const allowed = new Set(baseline.edges);
  const current = new Set(cyclicEdges(graph));
  return [...current].filter(edge => !allowed.has(edge))
    .concat([...allowed].filter(edge => !current.has(edge)).map(edge => `Remove resolved cycle allowance: ${edge}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { graph, dynamic } = dependencyGraph(sourceFiles(root, ['game3d/js', 'game3d/story'], /\.js$/));
  const cycles = (await madge(graph)).circular();
  if (process.argv.includes('--inventory')) console.log(JSON.stringify({ edges: cyclicEdges(graph), cycles, dynamic }, null, 2));
  else {
    const baseline = JSON.parse(fs.readFileSync(new URL('./cycle-baseline.json', import.meta.url), 'utf8'));
    const added = checkCycleBaseline(graph, baseline);
    assert(!added.length, `New cyclic dependencies:\n${added.join('\n')}`);
    console.log(`dependencies: ${Object.keys(graph).length} modules; ${cycles.length} existing cycle paths; ${dynamic.length} nonliteral imports reported`);
    for (const item of dynamic) console.log(`dynamic import: ${item.file}: ${item.expression}`);
  }
}
