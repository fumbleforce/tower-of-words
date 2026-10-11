// Shared story data that only becomes reachable after the first day is omitted from a day-one release.
// This removes whole authored nodes/choices; it never changes a spoken line.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const LATER_PEOPLE = new Set(['aoi', 'rei', 'kuro']);
// Neither the public opening nor the retained optional scenes teach these words.
export const LATER_WORDS = new Set(['yasumi', 'nomitai', 'yoyaku', 'isshoni']);
const LATER_TOPICS = new Set(['ask:mio-break', 'ask:guard-break', 'ask:kuroda-booking']);
const laterReaction = name => /^register_(aoi|rei|kuro)_/.test(name) || /^register_.*_[23]$/.test(name);
// Their setters are confined to the removed milestones and ongoing stories. Unknown conditions stay authored.
const LATER_CONDITIONS = new Set(['day >= 3', 'ms3_mio', 'art_photo_seen || ms2_mori || ms3_mori',
  'art_mori_started || ms3_mori', 'ms2_kuroda || karaoke_receipt_seen', ...[...LATER_WORDS].map(id => 'know_' + id)]);
function pruneSteps(list) {
  return list.flatMap(step => {
    if (!step || typeof step !== 'object') return [step];
    if (LATER_CONDITIONS.has(step.if) || step.needs?.includes('emi.swimming_club')) return pruneSteps(step.else || []);
    const result = { ...step };
    for (const key of ['then', 'else', 'choice']) if (Array.isArray(result[key])) result[key] = pruneSteps(result[key]);
    return [result];
  });
}
function reachable(story) {
  const needed = new Set(Object.values(story.on)), pending = [...needed];
  if (pending.some(name => typeof name !== 'string')) throw new Error('Day scope needs string conversation entry nodes');
  const targets = value => {
    if (!value || typeof value !== 'object') return [];
    return [...['go', 'call'].flatMap(key => typeof value[key] === 'string' ? [value[key]] : []), ...Object.values(value).flatMap(targets)];
  };
  while (pending.length) for (const next of targets(story.nodes[pending.pop()])) if (!needed.has(next)) { needed.add(next); pending.push(next); }
  story.nodes = Object.fromEntries(Object.entries(story.nodes).filter(([name]) => needed.has(name)));
  return story;
}
export async function dayOneConversations(root) {
  const mod = name => import(pathToFileURL(path.join(root, 'game3d/story/conversations', name + '.js')).href);
  const load = async name => structuredClone((await mod(name)).default);
  const story = await load('index'), parts = {};
  for (const name of ['emi', 'mio', 'mori', 'hamada', 'guard']) {
    const original = await load(name);
    for (const trigger of LATER_TOPICS) delete original.on[trigger];
    for (const node of Object.keys(original.nodes)) delete story.nodes[node];
    original.nodes = Object.fromEntries(Object.entries(original.nodes).map(([node, steps]) => [node, pruneSteps(steps)]));
    parts[name] = reachable(original);
    Object.assign(story.nodes, parts[name].nodes);
  }
  const register = { ...await mod('register') };
  register.default = structuredClone(register.default);
  register.default.nodes = Object.fromEntries(Object.entries(register.default.nodes).filter(([name]) => !laterReaction(name)));
  const remarks = (await mod('remarks')).REMARKS.filter(remark => !LATER_PEOPLE.has(remark.who) && !remark.words.some(word => LATER_WORDS.has(word)));
  const needs = Object.fromEntries(Object.entries((await mod('needs')).NEEDS).filter(([name]) => name !== 'emi.swimming_club'));
  for (const trigger of Object.keys(story.on)) if (LATER_TOPICS.has(trigger) || LATER_PEOPLE.has(trigger.split(':')[1]?.split('-')[0])) delete story.on[trigger];
  for (const name of Object.keys(story.nodes)) if (/^chat_(aoi|rei|kuro)(_|$)/.test(name) || laterReaction(name)) delete story.nodes[name];
  return { story, parts, register, remarks, needs, removed: [...LATER_PEOPLE].map(name => `game3d/story/conversations/${name}.js`) };
}
