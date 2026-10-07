// Read literal stories and their imported garden composition without executing story modules.
import { parseSource, staticValue } from './source-data.mjs';

export function staticStory(file, read) {
  const modules = new Map();
  const module = name => {
    if (!modules.has(name)) modules.set(name, parseSource(read(name)));
    return modules.get(name);
  };
  function value(node, name, scope = {}, visiting = new Set()) {
    if (node?.type === 'Identifier') {
      if (Object.hasOwn(scope, node.name)) return scope[node.name];
      const key = name + ':' + node.name;
      if (visiting.has(key)) throw new Error(`Cyclic story binding ${key}`);
      const binding = module(name).body.flatMap(s => (s.declaration || s).declarations || [])
        .find(d => d.id.type === 'Identifier' && d.id.name === node.name);
      if (!binding) throw new Error(`Unresolved story binding ${key}`);
      return value(binding.init, name, scope, new Set([...visiting, key]));
    }
    if (node?.type === 'ObjectExpression') {
      const out = {};
      for (const p of node.properties) {
        if (p.type === 'SpreadElement') Object.assign(out, value(p.argument, name, scope, visiting));
        else {
          if (p.computed || p.method || p.kind !== 'init') throw new Error('Dynamic story property');
          out[p.key.name ?? p.key.value] = value(p.value, name, scope, visiting);
        }
      }
      return out;
    }
    if (node?.type === 'ArrayExpression') return node.elements.flatMap(e => e.type === 'SpreadElement'
      ? value(e.argument, name, scope, visiting) : [value(e, name, scope, visiting)]);
    if (node?.type === 'MemberExpression' && !node.computed) {
      const object = value(node.object, name, scope, visiting);
      if (!object || typeof object !== 'object') throw new Error('Unresolved story property');
      return Object.hasOwn(object, node.property.name) ? object[node.property.name] : undefined;
    }
    if (node?.type === 'CallExpression') {
      const imported = module(name).body.find(s => s.type === 'ImportDeclaration' && s.specifiers.some(
        p => p.type === 'ImportSpecifier' && p.local.name === node.callee.name && p.imported.name === 'withStationGarden'));
      if (!imported || node.callee.type !== 'Identifier' || node.arguments.length !== 1)
        throw new Error('Unsupported story composition call');
      const target = new URL(imported.source.value, 'file:///' + name).pathname.slice(1);
      if (!target.startsWith('game3d/story/')) throw new Error('Story composition outside story modules');
      const fn = module(target).body.find(s => s.type === 'ExportNamedDeclaration' && s.declaration?.type === 'FunctionDeclaration'
        && s.declaration.id.name === 'withStationGarden')?.declaration;
      if (!fn || fn.params.length !== 1 || fn.params[0].type !== 'Identifier' || fn.body.body.length !== 1
        || fn.body.body[0].type !== 'ReturnStatement') throw new Error('Dynamic story composition');
      const arg = value(node.arguments[0], name, scope, visiting);
      return value(fn.body.body[0].argument, target, { [fn.params[0].name]: arg }, visiting);
    }
    return staticValue(node);
  }
  return value(module(file).body.find(s => s.type === 'ExportDefaultDeclaration')?.declaration, file);
}
