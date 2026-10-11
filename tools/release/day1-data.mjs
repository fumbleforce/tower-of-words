// Shared story data that only becomes reachable after the first day is omitted from a day-one release.
// This removes whole authored nodes/choices; it never changes a spoken line.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const LATER_PEOPLE = new Set(['aoi', 'rei', 'kuro']);
export async function dayOneConversations(root) {
  const load = async name => structuredClone((await import(pathToFileURL(path.join(root, 'game3d/story/conversations', name + '.js')).href)).default);
  const mod = name => import(pathToFileURL(path.join(root, 'game3d/story/conversations', name + '.js')).href);
  const register = { ...await mod('register') };
  register.default = structuredClone(register.default);
  register.default.nodes = Object.fromEntries(Object.entries(register.default.nodes).filter(([name]) => !/^register_(aoi|rei|kuro)_/.test(name)));
  const remarks = (await mod('remarks')).REMARKS.filter(remark => !LATER_PEOPLE.has(remark.who));
  const needs = Object.fromEntries(Object.entries((await mod('needs')).NEEDS).filter(([name]) => name !== 'emi.swimming_club'));
  const story = await load('index');
  const emi = await load('emi');
  const first = emi.nodes.chat_emi;
  for (const step of first) if (step.choice) step.choice = step.choice.filter(choice =>
    choice.if !== 'day >= 3' && !choice.needs?.includes('emi.swimming_club'));
  // Keep only nodes reachable from Emi's retained entry. Follow each authored go, including nested choice branches.
  const needed = new Set(Object.values(emi.on)), pending = [...needed];
  const targets = value => {
    if (!value || typeof value !== 'object') return [];
    return [...(typeof value.go === 'string' ? [value.go] : []), ...Object.values(value).flatMap(targets)];
  };
  while (pending.length) for (const next of targets(emi.nodes[pending.pop()])) if (!needed.has(next)) { needed.add(next); pending.push(next); }
  emi.nodes = Object.fromEntries(Object.entries(emi.nodes).filter(([name]) => needed.has(name)));
  for (const trigger of Object.keys(story.on)) if (LATER_PEOPLE.has(trigger.split(':')[1]?.split('-')[0])) delete story.on[trigger];
  for (const name of Object.keys(story.nodes)) if (/^(chat_(aoi|rei|kuro|emi)(_|$)|register_(aoi|rei|kuro)_)/.test(name)) delete story.nodes[name];
  Object.assign(story.nodes, emi.nodes);
  return { story, emi, register, remarks, needs, removed: [...LATER_PEOPLE].map(name => `game3d/story/conversations/${name}.js`) };
}
