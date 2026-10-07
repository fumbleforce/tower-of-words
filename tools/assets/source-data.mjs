// Read asset metadata without loading renderers or starting audio/model requests.
import fs from 'node:fs';
import { staticStory } from '../lib/static-story.mjs';
import { parseSource, visitSource, sourceBindings, staticValue, propertyName } from '../lib/source-data.mjs';
import { STORY_FILES } from '../../game3d/js/places/definitions.js';

const root = new URL('../../', import.meta.url);
export const assetSourceFiles = fs.readdirSync(new URL('game3d/js/', root), { recursive: true })
  .filter(file => file.endsWith('.js')).map(file => 'game3d/js/' + file).sort();

function inlineIcons(ast, file) {
  const icons = [];
  visitSource(ast, (node, ancestors) => {
    const value = node.type === 'Literal' && typeof node.value === 'string' ? node.value
      : node.type === 'TemplateElement' ? node.value.cooked : null;
    if (!value) return;
    for (const match of value.matchAll(/<svg viewBox="0 0 (\d+) (\d+)"[^>]*>(.*?)<\/svg>/gs)) {
      const before = value.slice(0, match.index);
      const attribute = [...before.matchAll(/(?:aria-label|id)="([^"]+)"/g)].at(-1)?.[1];
      const element = ancestors.toReversed().find(parent => parent.type === 'CallExpression' && parent.callee.name === 'el');
      const declaration = ancestors.toReversed().find(parent => parent.type === 'VariableDeclarator');
      const label = attribute || element?.arguments[1]?.value || declaration?.id.name || 'Icon';
      icons.push({ file, label, width: match[1], height: match[2], body: match[3] });
    }
  });
  return icons;
}

export function assetSourceData(read) {
  const asts = new Map();
  const ast = file => {
    if (!asts.has(file)) asts.set(file, parseSource(read(file)));
    return asts.get(file);
  };
  // a table may spread in another module's (lang.js: ...DAY2.WORDS from story/day2/words.js); those are read too
  const table = (file, name) => {
    const init = sourceBindings(ast(file), [name])[name].init;
    if (init?.type !== 'ObjectExpression' || !init.properties.some(p => p.type === 'SpreadElement')) return staticValue(init);
    const out = {};
    for (const property of init.properties) {
      if (property.type !== 'SpreadElement') { Object.assign(out, staticValue({ ...init, properties: [property] })); continue; }
      const { object, property: member } = property.argument;
      const from = ast(file).body.find(n => n.type === 'ImportDeclaration'
        && n.specifiers.some(sp => sp.type === 'ImportNamespaceSpecifier' && sp.local.name === object?.name));
      if (!from) throw new Error(`${file}: ${name} spreads something that isn't a module's table`);
      Object.assign(out, table(new URL(from.source.value, new URL(file, root)).href.slice(root.href.length), member.name));
    }
    return out;
  };
  const words = table('game3d/js/lang.js', 'WORDS');
  const wordIcons = table('game3d/js/lang.js', 'ICON');
  const music = table('game3d/js/places/lifecycle.js', 'MUSIC');
  const emotes = table('game3d/js/narrative/hooks/presentation.js', 'EMOTE_SVG');
  const beds = table('game3d/js/ambience.js', 'BEDS');
  const events = table('game3d/js/ambience.js', 'EVENTS');
  const sfx = table('game3d/js/sfx.js', 'K');
  const cast3d = table('game3d/js/cast3d.js', 'CAST3D_ON');
  const stylesNode = sourceBindings(ast('game3d/js/style/index.js'), ['STYLES']).STYLES.init;
  const styles = Object.fromEntries(stylesNode.properties.map(property => {
    const fields = Object.fromEntries(property.value.properties.map(field => [field.key.name ?? field.key.value, field.value]));
    return [property.key.value ?? property.key.name, { name: staticValue(fields.name), note: staticValue(fields.note) }];
  }));

  const peopleNode = sourceBindings(ast('game3d/js/cast.js'), ['PEOPLE']).PEOPLE.init;
  const people = Object.fromEntries(peopleNode.properties.map(property => {
    const body = property.value.body;
    const comments = ast('game3d/js/cast.js').comments
      .filter(comment => comment.range[0] > body.range[0] && comment.range[1] < body.range[1])
      .map(comment => comment.value.trim());
    return [property.key.name ?? property.key.value, { comments, used: [] }];
  }));
  const strings = new Set(), sfxCalls = new Set(), sceneCalls = {};
  for (const file of assetSourceFiles) visitSource(ast(file), (node, ancestors) => {
    const presentationFile = file === 'game3d/js/places/lifecycle.js' || /^game3d\/js\/[^/]+\.js$/.test(file) || /^game3d\/js\/(ui|audio|narrative\/hooks|gameplay|movement)\//.test(file);
    const parent = ancestors.at(-1);
    const propertyKey = parent?.type === 'Property' && parent.key === node && !parent.computed;
    if (presentationFile && !propertyKey && node.type === 'Literal' && typeof node.value === 'string') strings.add(node.value);
    if (presentationFile && node.type === 'TemplateLiteral' && !node.expressions.length) strings.add(staticValue(node));
    if (node.type !== 'CallExpression') return;
    if (presentationFile && node.callee.name === 'sfx' && typeof node.arguments[0]?.value === 'string')
      sfxCalls.add(node.arguments[0].value);
    if (file === 'game3d/js/places/lifecycle.js' || !/^game3d\/js\/(places|scenes)\//.test(file)) return;
    const place = file.split('/').at(-1).replace('.js', '').replace(/^lobby$/, 'gate');
    if (node.callee.type === 'Identifier') {
      const places = sceneCalls[node.callee.name] ||= [];
      if (!places.includes(place)) places.push(place);
    }
    if (node.callee.object?.name !== 'PEOPLE') return;
    const id = propertyName(node.callee);
    if (!people[id]) throw new Error(`${file}: unknown PEOPLE factory ${id}`);
    if (!people[id].used.includes(place)) people[id].used.push(place);
  });
  for (const person of Object.values(people)) person.used.sort();
  for (const places of Object.values(sceneCalls)) places.sort();
  const exportedFunctions = Object.fromEntries(assetSourceFiles.map(file => [file, ast(file).body
    .filter(node => node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'FunctionDeclaration')
    .map(node => node.declaration.id.name)]));

  const stories = {};
  for (const name of STORY_FILES) {
    const story = staticStory(`game3d/story/${name}.js`, read);
    const speakers = {}, texts = [];
    const walk = value => {
      if (typeof value === 'string') {
        texts.push(value);
        const speaker = /^(\w+): /.exec(value)?.[1];
        if (speaker) speakers[speaker] = (speakers[speaker] || 0) + 1;
      } else if (value && typeof value === 'object') {
        if (typeof value.say === 'string') speakers[value.say] = (speakers[value.say] || 0) + 1;
        Object.values(value).forEach(walk);
      }
    };
    walk(story);
    const names = Object.fromEntries(Object.entries({ ...story.speakers, ...story.people })
      .filter(([, person]) => person.name).map(([id, person]) => [id, person.name]));
    stories[name] = { speakers, texts, names };
  }
  const iconFiles = ['game3d/js/ui.js', ...assetSourceFiles.filter(file => file.startsWith('game3d/js/ui/') || file.startsWith('game3d/js/saves/')),
    ...['menu', 'engine', 'speech'].map(name => `game3d/js/${name}.js`)];
  const icons = iconFiles.flatMap(file => inlineIcons(ast(file), file));
  return { words, wordIcons, music, emotes, beds, events, sfx, cast3d, styles, people, stories,
    icons, sceneCalls, exportedFunctions, strings: [...strings].sort(), sfxCalls: [...sfxCalls].sort() };
}
