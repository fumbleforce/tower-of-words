// Narrative place order and source references, consumed by the runtime and its checks.
export const PLACE_FILES = {
  train: 'game3d/js/places/train.js',
  gate: 'game3d/js/places/lobby.js',
  forecourt: 'game3d/js/places/forecourt.js',
  plaza: 'game3d/js/places/plaza.js',
  office: 'game3d/js/places/office.js',
  dorms: 'game3d/js/places/dorms.js',
};
// Place names for the save list and the end-of-day photos.
export const PLACE_NAMES = {
  train: 'Monorail',
  gate: 'Station security',
  forecourt: 'Forecourt',
  plaza: 'Fountain plaza',
  office: 'IT support, B2',
  dorms: "Eric's room",
};
export const NEXT = { train: 'gate', gate: 'forecourt', forecourt: 'office' };
// Side trips off the day's line: walks between outdoor chunks, both ways, played by the story's `trip` step.
export const TRIPS = { forecourt: ['plaza'], plaza: ['forecourt'] };
export const canTravel = (from, to) => NEXT[from] === to || !!TRIPS[from]?.includes(to);
export const STORY_FILES = ['train', 'gate', 'forecourt', 'plaza', 'office', 'dorms', 'transitions'];
