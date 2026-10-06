// Presentation data is derived from the existing story docs and scene descriptors.
import { section, table } from './live.js';
export const plain = text => String(text || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').trim();
export const excerpt = (text, n = 92) => { const t = plain(text); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
const aliases = { Ishibashi: 'guard', Hamada: 'kuroda' };
export function characterRoutes(cast, scenes = []) {
  const text = section(cast, 'Personal plots and bond milestones');
  return text.split(/^### /m).slice(1).map(block => {
    const [heading] = block.split('\n');
    const [name, ...title] = heading.split(':');
    const id = aliases[name.trim()] || name.trim().toLowerCase();
    const route = block.match(/^Route: (.+)$/m)?.[1] || '';
    const meeting = block.match(/^Repeat meeting: (.+)$/m)?.[1] || '';
    return { id, name: name.trim(), title: title.join(':').trim(), route: plain(route), meeting: plain(meeting),
      steps: table(block).filter(([step]) => /^[0-5]$/.test(step)).map(([step, text]) => {
        const written = scenes.filter(s => s.who === id && s.step === +step);
        return { key: `${id}:${step}`, column: +step, text: plain(text), status: written.length ? 'written' : 'plan', written,
          source: 'docs/game/cast.md', sourceLabel: 'Character plan' };
      }) };
  }).filter(route => route.steps.length);
}
export function calendarStories(stories, files, routes) {
  return routes.map(route => ({ ...route, steps: stories.filter(s => s.cast.includes(route.id)).map(story => ({
    key: `${route.id}:${story.id}`, column: story.day - 1, text: plain(story.title), detail: plain(section(files[story.file] || '', 'Beats')),
    status: /^built/.test(story.status || '') ? 'built' : 'documented', source: story.file, sourceLabel: story.title, storyId: story.id,
  })).filter(s => s.column >= 0 && s.column < 5) }));
}

export function storyCast(stories) {
  const ids = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if ((key === 'say' || key === 'who') && typeof item === 'string') ids.add(item === 'miotext' ? 'mio' : item);
      else if (typeof item === 'object') visit(item);
    }
  };
  visit(stories); return [...ids];
}
