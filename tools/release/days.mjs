// Restrict a dereferenced release stage. The source checkout and shared assets are never changed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { dayOneConversations } from './day1-data.mjs';

export const LATER_STORY = /^game3d\/story\/(?:day[2-5]\/|ongoing\/|milestones\/|clubs\.js$|days3-5-finds\.js$)/;
const EMPTY = 'game3d/js/release-empty.js';
const WORDS = /^game3d\/story\/day([234])\/words\.js$/;
const DATA = /^game3d\/story\/(?:day[2-5]\/index\.js|ongoing\/routes\.js|clubs\.js|days3-5-finds\.js)$/;
const emptySource = `export const STORIES = {}, TRIPS = {}, ROUTES = {}, KOTODAMA = {}, NODES = {};
export const OPEN_PLACES = [], FINDS = [];
export default { clubs: {}, events: [], nodes: {} };
`;
function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const abs = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error(`day scope refuses symlinks: ${abs}`);
    return e.isDirectory() ? files(abs, base) : [path.relative(base, abs).split(path.sep).join('/')];
  });
}
function replace(dir, rel, text) {
  const dest = path.join(dir, rel), tmp = `${dest}.days-${process.pid}`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(tmp, text, { flag: 'wx' });
  fs.renameSync(tmp, dest); // do not write through a hard link
}
function remapImports(text, from, output = from) {
  return text.replace(/(['"])(\.{1,2}\/[^'"\n]+\.js)\1/g, (match, quote, spec) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
    if (!LATER_STORY.test(target)) return match;
    const word = WORDS.exec(target);
    const dest = word ? `game3d/js/release-words-${word[1]}.js` : DATA.test(target) ? EMPTY : null;
    if (!dest) throw new Error(`${from} references later story ${target}; declare its shared contract first`);
    let relative = path.posix.relative(path.posix.dirname(output), dest);
    if (!relative.startsWith('.')) relative = './' + relative;
    return quote + relative + quote;
  });
}

export async function scopeDays({ dir, root, days }) {
  if (days !== 1) throw new Error('day scope currently supports only day 1');
  const stage = fs.realpathSync(dir);
  if (!stage.split(path.sep).includes('dist') || stage === fs.realpathSync(root)) throw new Error('day scope requires a stage under dist/');
  const list = files(stage); // validate all links before any mutation
  const read = rel => fs.readFileSync(path.join(stage, rel), 'utf8');
  const writes = new Map([[EMPTY, emptySource]]);
  const conversations = await dayOneConversations(root);
  writes.set('game3d/story/conversations/index.js', 'export default ' + JSON.stringify(conversations.story) + ';\n');
  writes.set('game3d/story/conversations/remarks.js', 'export const REMARKS = ' + JSON.stringify(conversations.remarks) + ';\n');
  writes.set('game3d/story/conversations/needs.js', 'export const NEEDS = ' + JSON.stringify(conversations.needs) + ';\n');
  writes.set('game3d/story/conversations/register.js', Object.entries(conversations.register).map(([name, value]) =>
    (name === 'default' ? 'export default ' : `export const ${name} = `) + JSON.stringify(value) + ';').join('\n'));
  writes.set('game3d/story/conversations/emi.js', 'export default ' + JSON.stringify(conversations.emi) + ';\n');
  const tickets = (await import(pathToFileURL(path.join(root, 'game3d/story/tickets.js')).href)).default;
  // Day one's closing screen previews the station request; subsequent requests do not appear that day.
  writes.set('game3d/story/tickets.js', 'export default ' + JSON.stringify(Object.fromEntries(
    Object.entries(tickets).filter(([id]) => ['T-0001', 'T-0002'].includes(id)))) + ';\n');
  const narrative = list.filter(f => f.startsWith('game3d/story/') && f.endsWith('.js') && !LATER_STORY.test(f) && !conversations.removed.includes(f))
    .map(f => writes.get(f) ?? read(f)).join('\n');
  const { WORDS: vocabulary } = await import(pathToFileURL(path.join(root, 'game3d/js/lang.js')).href);
  const usedWords = new Set(Object.keys(vocabulary).filter(id =>
    new RegExp(`\\{${id}\\}|['"]${id}['"]|\\bknow_${id}\\b`).test(narrative)));
  // Retain later-introduced words only when a first-day conversation also uses or teaches them.
  for (const rel of list.filter(f => WORDS.test(f))) {
    const n = WORDS.exec(rel)[1];
    const original = await import(pathToFileURL(path.join(root, rel)).href);
    const data = Object.fromEntries(Object.entries(original).map(([name, value]) => [name,
      name.endsWith('WORDS') ? Object.fromEntries(Object.entries(value).filter(([id]) => usedWords.has(id))) : value]));
    writes.set(`game3d/js/release-words-${n}.js`, Object.entries(data).map(([name, value]) => `export const ${name} = ${JSON.stringify(value)};`).join('\n'));
  }
  for (const rel of list.filter(f => /^game3d\/.+\.js$/.test(f) && !LATER_STORY.test(f))) {
    const source = writes.get(rel) ?? read(rel), mapped = remapImports(source, rel);
    if (source !== mapped) writes.set(rel, mapped);
  }
  const scope = 'game3d/js/content-scope.js';
  if (!read(scope).includes('export const MAX_DAY = Infinity;')) throw new Error('content-scope contract changed');
  writes.set(scope, read(scope).replace('export const MAX_DAY = Infinity;', 'export const MAX_DAY = 1;'));
  // Use the same authored voice keys as production, including shared conversations and both protagonists.
  const { voiceLines, storySets } = await import(pathToFileURL(path.join(root, 'game3d/tools/voice-manifest.mjs')).href);
  const all = await voiceLines();
  const sets = storySets().filter(set => set.day <= 1).map(set => set.day === 0 ?
    { ...set, files: [{ name: 'conversations', load: async () => conversations.story }] } : set);
  const kept = await voiceLines({ sets });
  const allKeys = new Set(Object.values(all).flat().map(line => line.key));
  const keepKeys = new Set(Object.values(kept).flat().filter(line => {
    const word = /^(?:word|eric|carina)-(.+)$/.exec(line.key);
    return word ? usedWords.has(word[1]) : line.day <= 1;
  }).map(line => line.key));
  const removed = list.filter(f => LATER_STORY.test(f) || conversations.removed.includes(f) ||
    (/^game3d\/audio\/[^/]+\.mp3$/.test(f) && allKeys.has(path.basename(f, '.mp3')) && !keepKeys.has(path.basename(f, '.mp3'))));
  const removedSet = new Set(removed);
  const index = 'game3d/audio/index.json';
  writes.set(index, JSON.stringify(JSON.parse(read(index)).filter(key => !removedSet.has(`game3d/audio/${key}.mp3`))));
  for (const [rel, source] of writes) replace(stage, rel, source);
  for (const rel of removed) fs.rmSync(path.join(stage, rel));
  for (const day of ['day2', 'day3', 'day4', 'day5', 'ongoing', 'milestones']) fs.rmSync(path.join(stage, 'game3d/story', day), { recursive: true, force: true });
  const report = { days, removedStories: removed.filter(f => f.startsWith('game3d/story/')).length, removedVoices: removed.filter(f => f.endsWith('.mp3')).length };
  replace(stage, 'day-scope.json', JSON.stringify(report));
  return report;
}
