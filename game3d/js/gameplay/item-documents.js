import { DIRECTORY_ID, directoryPages } from './island-directory.js';
// Immutable pure text providers; the Bag owns the single read interaction.
export const ITEM_DOCUMENTS = Object.freeze({ [DIRECTORY_ID]: directoryPages });
export function itemDocumentPages(id) {
  return ITEM_DOCUMENTS[id]?.() || null;
}
