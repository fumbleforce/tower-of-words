// Narrative place order and source references, consumed by the runtime and its checks.
export const PLACE_FILES = {
  train: 'game3d/js/places/train.js',
  gate: 'game3d/js/places/lobby.js',
  office: 'game3d/js/places/office.js',
};
export const NEXT = { train: 'gate', gate: 'office' };
export const STORY_FILES = ['train', 'gate', 'office', 'transitions'];
