import { parseSource, visitSource, sourceBindings, staticValue, propertyName } from './source-data.mjs';

export function heardTextData(source) {
  const ast = parseSource(source);
  const bindings = sourceBindings(ast, ['POOL', 'INTERJ']);
  const POOL = staticValue(bindings.POOL.init), INTERJ = staticValue(bindings.INTERJ.init);
  if (typeof POOL !== 'string' || !Array.isArray(INTERJ) || !INTERJ.every(value => typeof value === 'string'))
    throw new Error('POOL and INTERJ must be a string and a string array');
  // A comment or an unused import does not establish that the UI uses the glossary.
  let glossed = false;
  visitSource(ast, node => {
    if (node.type === 'MemberExpression' && node.object?.name === 'INTERJ_GLOSS') glossed = true;
  });
  return { POOL, INTERJ, glossed };
}

function textContext(ancestors, node) {
  const local = [];
  for (const parent of ancestors.toReversed()) {
    local.push(parent);
    if (/Function/.test(parent.type)) break;
  }
  // Paired fillText calls in one texture callback describe the same sign.
  const callback = local.find(parent => /Function/.test(parent.type));
  const drawing = local.find(parent => parent.type === 'CallExpression' && propertyName(parent.callee) === 'fillText');
  const drawnText = drawing?.arguments[0];
  if (drawnText && node.range[0] >= drawnText.range[0] && node.range[1] <= drawnText.range[1] &&
    callback && ancestors.some(parent => parent.type === 'CallExpression' &&
    parent.callee.name === 'textTexture' && parent.arguments.includes(callback))) return callback;
  const context = local.find(parent => ['ArrayExpression', 'CallExpression', 'ObjectExpression'].includes(parent.type));
  // A sign's options belong to that call; an object row belongs only to itself.
  if (context?.type === 'ObjectExpression') {
    const call = local.find(parent => parent.type === 'CallExpression' && parent.arguments.includes(context));
    if (call) return call;
  }
  return context || node;
}

export function javascriptTextGroups(source, excludedBindings = []) {
  const ast = parseSource(source);
  const excluded = excludedBindings.length ? Object.values(sourceBindings(ast, excludedBindings)) : [];
  const groups = new Map();
  visitSource(ast, (node, ancestors) => {
    if (excluded.some(binding => node.range[0] >= binding.range[0] && node.range[1] <= binding.range[1])) return;
    const parent = ancestors.at(-1);
    if (parent?.type === 'Property' && parent.key === node && !parent.computed) return;
    const tagged = ancestors.at(-2);
    const raw = tagged?.type === 'TaggedTemplateExpression' && tagged.tag.object?.name === 'String'
      && propertyName(tagged.tag) === 'raw';
    const value = node.type === 'Literal' && typeof node.value === 'string' ? node.value
      : node.type === 'TemplateElement' ? (raw ? node.value.raw : node.value.cooked) : null;
    if (value === null) return;
    const context = textContext(ancestors, node);
    if (!groups.has(context)) groups.set(context, []);
    groups.get(context).push({ value, line: node.loc.start.line });
  });
  return [...groups.values()];
}

export function speechHintUsesKnownWord(source) {
  let word = false, known = false;
  visitSource(parseSource(source), node => {
    if (node.type === 'MemberExpression' && propertyName(node) === 'ja' &&
      node.object.type === 'MemberExpression' && node.object.object.name === 'WORDS') word = true;
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
      node.callee.object.name === 'known' && propertyName(node.callee) === 'has') known = true;
  });
  return word && known;
}
