// Loads a place's story module (Runner.load). Lives in game3d/js/ because the import paths are relative to it.
import { storyPath, storyRegistered } from './days.js';

// A registered story module (days.js storyRegistered) that would not import: the place must not be entered empty.
export class StoryMissingError extends Error {
  constructor(name, cause) {
    super(`The story for ${name} did not load.`);
    this.name = 'StoryMissingError';
    this.place = name;
    this.cause = cause;
  }
}

const EMPTY = () => ({ nodes: {}, on: {} });

async function tryImport(p, name, expected) {
  try {
    const story = (await import(p)).default;
    if (expected && !story) throw new StoryMissingError(name);
    return story;
  } catch (e) {
    if (e instanceof StoryMissingError) throw e;
    if (expected) throw new StoryMissingError(name, e);
    if (!/Failed to fetch|Cannot find|404|error loading/i.test(String(e))) console.error(e);
    return null;
  }
}

// The story for a place on a day, before the protagonist tokens are filled in. Intentional fallbacks: day 1 falls back
// to the placeholder story and then to an empty one; a later day's place its index doesn't list has an empty story.
// A place the day's index lists must load, or this throws StoryMissingError and the trip stops (places/story-guard.js).
export async function importStory(name, day) {
  if (day > 1) return (await tryImport(storyPath(name, day), name, storyRegistered(name, day))) || EMPTY();
  return (
    (await tryImport(`../story/${name}.js`, name, false)) ||
    (await tryImport(`../story/placeholder/${name}.js`, name, false)) ||
    EMPTY()
  );
}
