import {standaloneComposition} from '../../subplots/web/image-standalone.js';

export const STUDIO_STORAGE_KEY = 'imagegen.studio.compose.v1';
// Keep public and private drafts separate. Only private mode may migrate the older, shared draft key.
export function loadStudioComposition(storage, privateMode = false) {
  const keys = [STUDIO_STORAGE_KEY + (privateMode ? '.private' : '.public')];
  if (privateMode) keys.push(STUDIO_STORAGE_KEY, 'imagegen.compose');
  for (const key of keys) {
    try {
      const value = JSON.parse(storage?.getItem(key) || 'null');
      if (value && typeof value === 'object' && !Array.isArray(value)) return standaloneComposition(value);
    } catch { /* Try the legacy draft or a blank composition. */ }
  }
  return standaloneComposition();
}
export function saveStudioComposition(storage, composition, privateMode = false) {
  storage.setItem(STUDIO_STORAGE_KEY + (privateMode ? '.private' : '.public'), JSON.stringify(standaloneComposition(composition)));
}
