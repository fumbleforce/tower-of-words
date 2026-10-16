// Nobody in the game is built in code (notes/people-plan.md): the code-built chibi() of train/people.js is gone, and
// a person whose model did not load is a stand-in that is never drawn (train/people.js standIn, missing). This keeps it
// that way: no module may define or call a chibi() in train/people.js again, and the list of callers stays empty.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PEOPLE = 'game3d/js/train/people.js';
const CALLERS = {};

const isChibi = (callee, names, spaces) => (callee.type === 'Identifier' && names.has(callee.name))
  || (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier'
    && spaces.has(callee.object.name) && callee.property.name === 'chibi');

// The calls to the code-built chibi() in one module. Counted: a call through a name the module imports from
// train/people.js (under an alias, or as a member of a namespace import), and every call inside train/people.js itself.
// Not counted: comments, strings, a method called chibi, and a chibi() the module declares itself (viewer/roster.js has
// one for the chibi look, which is not the code-built body).
export function chibiCalls(source, file) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const names = new Set(file === PEOPLE ? ['chibi'] : []);
  const spaces = new Set();
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (path.posix.normalize(path.posix.join(path.posix.dirname(file), node.source.value)) !== PEOPLE) continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportNamespaceSpecifier') spaces.add(spec.local.name);
      else if ((spec.imported.name ?? spec.imported.value) === 'chibi') names.add(spec.local.name);
    }
  }
  let calls = 0;
  const visit = (node) => {
    if (node.type === 'CallExpression' && isChibi(node.callee, names, spaces)) calls++;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'range') continue;
      for (const child of [value].flat()) if (child?.type) visit(child);
    }
  };
  visit(ast);
  return calls;
}

function jsFiles() {
  return fs.readdirSync(path.join(ROOT, 'game3d/js'), { recursive: true })
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => /\.m?js$/.test(f))
    .map((f) => `game3d/js/${f}`);
}

test('nobody calls a code-built chibi()', () => {
  const found = {};
  for (const file of jsFiles()) {
    const n = chibiCalls(fs.readFileSync(path.join(ROOT, file), 'utf8'), file);
    if (n) found[file] = n;
  }
  const problems = [];
  for (const [file, n] of Object.entries(found)) {
    if (!(file in CALLERS)) problems.push(`${file}: calls the code-built chibi() ${n} time(s), and is not on the list. Draw people from their Meshy models instead, with a stand-in when one fails (notes/people-plan.md).`);
    else if (n > CALLERS[file]) problems.push(`${file}: calls chibi() ${n} times, ${CALLERS[file]} on the list. The count may only go down.`);
    else if (n < CALLERS[file]) problems.push(`${file}: calls chibi() ${n} times now, ${CALLERS[file]} on the list. Lower its count to ${n}.`);
  }
  for (const file of Object.keys(CALLERS)) {
    if (!(file in found)) problems.push(`${file}: no longer calls chibi(). Remove it from the list.`);
  }
  assert.equal(problems.length, 0, problems.join('\n'));
});

test('chibi() calls: the imported function counts under any name it is imported as', () => {
  const cast = 'game3d/js/cast.js';
  assert.equal(chibiCalls("import { chibi } from './train/people.js';\nchibi({});\nchibi({});", cast), 2);
  assert.equal(chibiCalls("import { chibi as make } from './train/people.js';\nmake({});", cast), 1);
  assert.equal(chibiCalls("import * as people from './train/people.js';\npeople.chibi({});", cast), 1);
});

test('chibi() calls: comments, strings, method calls, other modules and local functions do not count', () => {
  const cast = 'game3d/js/cast.js';
  assert.equal(chibiCalls("import { chibi } from './train/people.js';\n// chibi({});\nconst s = 'chibi({})';\nobj.chibi({});", cast), 0);
  assert.equal(chibiCalls("import { chibi } from './chibi.js';\nchibi({});", cast), 0);
  assert.equal(chibiCalls("function chibi(key) { return key; }\nchibi('x');", 'game3d/js/viewer/roster.js'), 0);
});

test('train/people.js counts its own calls to chibi()', () => {
  assert.equal(chibiCalls('export function chibi(o) { return o; }\nexport const x = chibi({});', PEOPLE), 1);
});

test('train/people.js has no chibi() to call', () => {
  const ast = parse(fs.readFileSync(path.join(ROOT, PEOPLE), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  const names = ast.body.flatMap((n) => (n.type === 'ExportNamedDeclaration' ? [n.declaration?.id?.name, ...n.specifiers.map((s) => s.exported.name)] : n.type === 'FunctionDeclaration' ? [n.id.name] : []));
  assert.ok(!names.includes('chibi'), 'train/people.js defines chibi() again');
});
