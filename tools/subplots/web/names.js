// Readable names for ids, from the bible data (/api/subplots/authoring).
import { S } from './store.js';

export const humanize = value => String(value ?? '')
  .replace(/^enc_d(\d+)_/, 'Day $1 · ')
  .replace(/^d(\d+)[-_]/, 'Day $1 · ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^./, c => c.toUpperCase())
  .replace(/· (\w)/g, (m, c) => '· ' + c.toUpperCase());

export const person = id => S.authoring.characters.find(c => c.id === id);
export function personName(id) {
  if (!id) return 'Narration';
  const fromScene = S.scene?.speakers?.[id];
  return person(id)?.name || (typeof fromScene === 'string' ? fromScene : fromScene?.name) || humanize(id);
}
export const personColor = id => person(id)?.color || '#a8b0bf';
export const portrait = id => person(id)?.portrait || '';

export const placeName = id => S.authoring.places.find(p => p.id === id)?.name || humanize(id);

// The title of a node of the open scene's file (for jumps and choices).
export function nodeTitle(node) {
  if (!node) return '';
  return humanize(node);
}

// Group of a catalog row as the author reads it: the place and day for public files, the scene for private ones.
export function areaOf(row) {
  if (row.audience === 'private') return row.group || 'Private scenes';
  const g = row.group || '';
  const parts = g.split('/');
  const base = parts.at(-1);
  const day = /^day(\d+)$/.exec(parts[0])?.[1];
  const place = S.authoring.places.find(p => p.id === base);
  const name = place ? place.name : humanize(base);
  if (day) return `Day ${day} · ${name}`;
  if (parts.length > 1) return `${humanize(parts[0])} · ${name}`;
  return name;
}

export function titleOf(row) {
  if (row.studioDraft) return row.title;
  if (row.audience === 'private' && row.scene) {
    const part = row.node === 'start' || row.node === 'steps' ? '' : ` · ${humanize(row.node)}`;
    return humanize(row.scene) + part;
  }
  return humanize(row.node || row.title);
}

// Where "Play in game" goes: the private viewer for a private scene, the place for a public one.
export function playUrl(scene) {
  if (!scene) return '';
  if (scene.studioDraft) return '';
  if (scene.previewUrl) return scene.previewUrl;
  const file = (scene.where || '').replace(/^game3d\/story\//, '').replace(/\.js$/, '');
  const parts = file.split('/');
  const place = parts.at(-1), day = /^day(\d+)$/.exec(parts[0])?.[1];
  if (!S.authoring.places.some(p => p.id === place)) return '';
  return `/game3d/index.html?${day && day !== '1' ? `day=${day}&` : ''}place=${place}`;
}
