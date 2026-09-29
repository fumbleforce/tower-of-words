// Narrative place order and source references, consumed by the runtime and its checks.
export const PLACE_FILES = {
  train: 'game3d/js/places/train.js',
  gate: 'game3d/js/places/lobby.js',
  forecourt: 'game3d/js/places/forecourt.js',
  office: 'game3d/js/places/office.js',
  dorms: 'game3d/js/places/dorms.js',
};
export const NEXT = { train: 'gate', gate: 'forecourt', forecourt: 'office' };
export const STORY_FILES = ['train', 'gate', 'forecourt', 'office', 'dorms', 'transitions'];
