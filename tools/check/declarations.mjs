// Verify the engine's named keys and event emissions against their declarations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseModule } from '../lib/place-source.mjs';
import { ENGINE_WRITES, flagKeys } from '../../game3d/js/narrative/engine-flags.js';
import { eventId, eventTrigger } from '../../game3d/js/narrative/events.js';
import { PLACE_FILES } from '../../game3d/js/places/definitions.js';

export const declarationFiles = fs.readdirSync(new URL('../../game3d/js/', import.meta.url), { recursive: true })
  .filter(file => file.endsWith('.js')).map(file => 'game3d/js/' + file).sort();
const readSource = file => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const property = node => node?.computed ? node.property?.value : node?.property?.name;
const member = (node, object, key) => node?.type === 'MemberExpression'
  && node.object?.name === object && property(node) === key;
const flagReference = node => node?.name === 'flags' ||
  (node?.type === 'MemberExpression' && property(node) === 'flagsRef');
const aliasesFlags = node => flagReference(node) ||
  (node?.type === 'LogicalExpression' && (aliasesFlags(node.left) || aliasesFlags(node.right))) ||
  (node?.type === 'ConditionalExpression' && (aliasesFlags(node.consequent) || aliasesFlags(node.alternate)));
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function storyKey(file, node) {
  if (file.endsWith('/runner.js')) return ['set', 'unset', 'inc'].some(key => member(node, 's', key)) || member(node, 'o', 'set');
  if (file.endsWith('/sim.js')) return member(node, 'a', 'set') || (node?.type === 'CallExpression'
    && member(node.callee, 'bonds', 'gate') && node.arguments.length === 2
    && node.arguments[0].name === 'who' && node.arguments[1].name === 'to');
  return false;
}
function hydration(file, node) {
  const object = file.endsWith('/main.js') ? 'saved' : file.endsWith('/sim.js') ? 'd' : null;
  return object && node?.type === 'LogicalExpression' && node.operator === '||'
    && member(node.left, object, 'flags') && node.right.type === 'ObjectExpression' && !node.right.properties.length;
}

export function checkDeclarations(read = readSource) {
  for (const file of declarationFiles) {
    const ast = parseModule(read(file)), bindings = new Map(), imports = new Map();
    for (const declaration of ast.body.filter(node => node.type === 'ImportDeclaration')) {
      const source = new URL(declaration.source.value, 'file:///' + file).pathname;
      for (const specifier of declaration.specifiers) {
        if (['/game3d/js/runner.js', '/game3d/js/narrative/state.js'].includes(source) && specifier.imported?.name === 'flags')
          assert.equal(specifier.local.name, 'flags', file + ': flags aliases are not supported');
        imports.set(specifier.local.name, { source, name: specifier.imported?.name });
      }
    }
    // The existing UI tip uses one local reference; keep it visible to this guard.
    const flagObject = node => flagReference(node) || (file === 'game3d/js/ui.js' && node?.name === 'F');
    const imported = (name, module, symbol) => imports.get(name)?.source === '/game3d/js/narrative/' + module
      && imports.get(name)?.name === symbol;
    walk(ast, node => {
      if (node.type !== 'VariableDeclarator' || node.init?.type !== 'CallExpression'
        || !imported(node.init.callee.name, 'engine-flags.js', 'flagKeys')) return;
      assert.equal(node.init.arguments.length, 1, file + ': flag owner must be explicit');
      assert.equal(node.init.arguments[0].value, file, file + ': incorrect flag owner');
      bindings.set(node.id.name, flagKeys(file));
    });
    // Returns a complete constant string, where the syntax permits one.
    const constant = node => {
      if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
      if (node?.type === 'MemberExpression' && bindings.has(node.object.name)) {
        const key = property(node);
        assert.equal(typeof key, 'string', file + ': named flag access must be static');
        return bindings.get(node.object.name)[key];
      }
      if (node?.type === 'BinaryExpression' && node.operator === '+') {
        const a = constant(node.left), b = constant(node.right);
        if (a !== undefined && b !== undefined) return a + b;
      }
      if (node?.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
    };
    const prefix = node => {
      const value = constant(node);
      if (value !== undefined) return value;
      if (node?.type === 'BinaryExpression' && node.operator === '+') return prefix(node.left);
      if (node?.type === 'TemplateLiteral') return node.quasis[0].value.cooked || prefix(node.expressions[0]);
    };
    const writes = { exact: new Set(), prefix: new Set() };
    walk(ast, node => {
      // Validate reads as well as writes, including gifts' differently named KEYS binding.
      if (node.type === 'MemberExpression' && bindings.has(node.object?.name)) constant(node);
      const pattern = node.type === 'VariableDeclarator' ? node.id : node.type === 'AssignmentExpression' ? node.left : null;
      const from = node.type === 'VariableDeclarator' ? node.init : node.type === 'AssignmentExpression' ? node.right : null;
      if (aliasesFlags(from) || (file === 'game3d/js/ui.js' && from?.name === 'F')) {
        const uiReference = file === 'game3d/js/ui.js' && node.type === 'VariableDeclarator' && pattern?.name === 'F'
          && from.type === 'LogicalExpression' && member(from.left, 'window', '__game')
          && property(from.right) === 'flagsRef' && member(from.right.object, 'window', '__game');
        const mainReference = file === 'game3d/js/main.js' && member(pattern, 'game', 'flagsRef') && from?.name === 'flags';
        assert.ok(uiReference || mainReference, file + ': flags aliases are not supported');
      }
      if (pattern?.type === 'ObjectPattern') for (const entry of pattern.properties)
        assert.notEqual(entry.key?.name ?? entry.key?.value, 'flagsRef', file + ': flags aliases are not supported');
      if (pattern?.type === 'ObjectPattern' && bindings.has(from?.name)) for (const entry of pattern.properties) {
        if (entry.type === 'RestElement') continue;
        const key = entry.computed ? entry.key.value : entry.key.name ?? entry.key.value;
        assert.equal(typeof key, 'string', file + ': named flag destructuring must be static');
        bindings.get(from.name)[key];
      }
      if (node.type === 'CallExpression' && property(node.callee) === 'event') {
        const argument = node.arguments[0];
        assert.ok(node.arguments.length === 1 && argument?.type === 'CallExpression'
          && imported(argument.callee.name, 'events.js', 'eventId'), file + ': event emission must use eventId');
      }
      if (node.type === 'CallExpression' && ['trigger', 'has', 'resolve', 'run'].includes(property(node.callee)) && prefix(node.arguments[0])?.startsWith('event:')) {
        // The engine forwards declared place emissions through this one boundary.
        const argument = node.arguments[0], receiver = node.callee.object;
        const forwarder = file === 'game3d/js/main.js' && receiver?.object?.type === 'ThisExpression'
          && property(receiver) === 'runner' && argument.type === 'BinaryExpression' && argument.operator === '+'
          && argument.left.value === 'event:' && argument.right.name === 'name';
        assert.ok(forwarder, file + ': event trigger must use eventTrigger');
      }
      if (node.type === 'CallExpression' && ['eventId', 'eventTrigger'].some(symbol => imported(node.callee.name, 'events.js', symbol))) {
        assert.equal(node.arguments.length, 2, file + ': event call needs place and name');
        const [place, name] = node.arguments, places = place.type === 'Literal' ? [place.value]
          : file === 'game3d/js/places/lifecycle.js' && place.name === 'name' ? Object.keys(PLACE_FILES) : null;
        assert.ok(places && typeof name.value === 'string', file + ': unresolved event emission');
        if (place.type !== 'Literal') assert.equal(name.value, 'start', file + ': unknown dynamic event');
        const resolve = imports.get(node.callee.name).name === 'eventId' ? eventId : eventTrigger;
        for (const id of places) resolve(id, name.value);
      }
      if (node.type === 'CallExpression' && member(node.callee, 'Object', 'assign') && flagObject(node.arguments[0])) {
        assert.equal(node.arguments.length, 2, file + ': unresolved bulk flag write');
        const value = node.arguments[1];
        const authored = file.endsWith('/runner.js') && (member(value, 's', 'set') || member(value, 'o', 'set'));
        assert.ok(authored || hydration(file, value), file + ': unresolved bulk flag write');
      }
      const target = node.type === 'AssignmentExpression' ? node.left : node.type === 'UpdateExpression' ? node.argument : null;
      if (target?.type !== 'MemberExpression' || !flagObject(target.object)) return;
      const key = target.computed ? target.property : { type: 'Literal', value: target.property.name };
      const exact = constant(key);
      if (exact !== undefined) writes.exact.add(exact);
      else if (storyKey(file, key)) return;
      else {
        const start = prefix(key);
        assert.ok(start, file + ': unresolved flag write');
        writes.prefix.add(start);
      }
    });
    const expected = ENGINE_WRITES[file] || { exact: [], prefix: [] };
    for (const kind of ['exact', 'prefix']) assert.deepEqual([...writes[kind]].sort(), [...expected[kind]].sort(),
      `${file}: ${kind} flag writes differ from declarations`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkDeclarations();
  console.log('PASS engine flag declarations and event emissions');
}
