// Parse factory registrations without importing Three.js or depending on source formatting.
// Covers explicit initial registries only. Post-construction mutations are checked by main.prepare at runtime.
import { parse } from 'espree';

export const parseModule = source => parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
const keyOf = property => {
  if (property.type !== 'Property' || property.computed) throw new Error('Registration keys must be explicit');
  return property.key.name ?? property.key.value;
};
const properties = node => {
  if (node?.type !== 'ObjectExpression') throw new Error('Expected an explicit registration object');
  return Object.fromEntries(node.properties.map(property => [keyOf(property), property.value]));
};

export function inspectPlaceSource(source) {
  const ast = parseModule(source);
  const factories = ast.body.filter(node => node.type === 'ExportNamedDeclaration' &&
    node.declaration?.type === 'FunctionDeclaration' && node.declaration.id.name.endsWith('Place'));
  if (factories.length !== 1) throw new Error('Expected exactly one exported place factory');
  const factory = factories[0].declaration;
  const variables = Object.fromEntries(factory.body.body.filter(node => node.type === 'VariableDeclaration')
    .flatMap(node => node.declarations).filter(node => node.id.type === 'Identifier')
    .map(node => [node.id.name, node.init]));
  const returned = factory.body.body.filter(node => node.type === 'ReturnStatement');
  if (returned.length !== 1 || returned[0].argument?.name !== 'P') throw new Error('Expected factory to return P');
  const place = properties(variables.P);
  const resolve = node => node?.type === 'Identifier' ? variables[node.name] : node;
  const objects = Object.fromEntries(['things', 'spots', 'seats', 'zones', 'people', 'hooks']
    .map(field => [field, properties(resolve(place[field]))]));
  const registrations = Object.fromEntries(Object.entries(objects).map(([field, value]) => [field, Object.keys(value)]));
  const text = node => source.slice(...node.range);
  const things = Object.fromEntries(Object.entries(objects.things).map(([id, node]) => {
    if (node.type !== 'ObjectExpression') throw new Error(`things.${id} must be explicit`);
    const fields = Object.fromEntries(node.properties.filter(p => p.type === 'Property').map(p => [keyOf(p), p.value]));
    const spreads = node.properties.filter(p => p.type === 'SpreadElement');
    const metadata = spreads.filter(p => p.argument.type === 'MemberExpression').map(p => {
      let value = p.argument, path = [];
      while (value.type === 'MemberExpression' && !value.computed) { path.unshift(value.property.name); value = value.object; }
      path.unshift(value.name);
      return path;
    });
    const at = spreads.find(p => p.argument.type === 'CallExpression' && p.argument.callee.name === 'at')?.argument;
    const anchor = fields.anchor;
    return [id, { metadata, overrides: ['label', 'kind', 'verb'].filter(key => fields[key]),
      anchor: anchor?.type === 'CallExpression' ? { function: anchor.callee.name, args: anchor.arguments.map(text) } : null,
      moving: anchor?.type === 'ArrowFunctionExpression', at: at?.arguments.map(text) ?? null,
      noMarker: fields.noMarker?.value === true }];
  }));
  return { factory: factory.id.name, registrations, things };
}
