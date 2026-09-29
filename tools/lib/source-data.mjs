// Static source readers for tools that must not boot DOM, audio or Three.js modules.
import { parse } from 'espree';

export const parseSource = source => parse(source, {
  ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true, comment: true,
});

export function visitSource(node, visit, ancestors = []) {
  if (!node?.type) return;
  visit(node, ancestors);
  for (const [key, value] of Object.entries(node)) {
    if (['comments', 'loc', 'range'].includes(key)) continue;
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child?.type) visitSource(child, visit, [...ancestors, node]);
    }
  }
}

export const propertyName = node => node?.computed ? node.property?.value : node?.property?.name;

export function staticValue(node) {
  if (node?.type === 'Literal' && !node.regex) return node.value;
  if (node?.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
  if (node?.type === 'ArrayExpression') return node.elements.map(staticValue);
  if (node?.type === 'ObjectExpression') return Object.fromEntries(node.properties.map(property => {
    if (property.type !== 'Property' || property.method || property.computed || property.kind !== 'init')
      throw new Error('Expected a static object property');
    return [property.key.name ?? property.key.value, staticValue(property.value)];
  }));
  if (node?.type === 'UnaryExpression' && node.operator === '-' && typeof node.argument.value === 'number')
    return -node.argument.value;
  throw new Error(`Expected static data, got ${node?.type || 'missing value'}`);
}

export function sourceBindings(ast, names) {
  const found = {};
  visitSource(ast, node => {
    if (node.type === 'VariableDeclarator' && names.includes(node.id.name)) {
      if (found[node.id.name]) throw new Error(`Ambiguous binding ${node.id.name}`);
      found[node.id.name] = node;
    }
  });
  for (const name of names) if (!found[name]) throw new Error(`Missing binding ${name}`);
  return found;
}
