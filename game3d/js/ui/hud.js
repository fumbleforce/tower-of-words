// HUD controls that need the running game after its player has loaded.
import { installItemDocuments } from './item-documents.js';
import { installMinimap } from './minimap.js';
import { installTimeMenu } from './time-menu.js';
export function installHud(game) {
  installMinimap(game);
  installItemDocuments(game);
  installTimeMenu(game);
}
