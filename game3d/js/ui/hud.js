// HUD controls that need the running game after its player has loaded.
import { installMinimap } from './minimap.js';
import { installTimeMenu } from './time-menu.js';
export function installHud(game) {
  installMinimap(game);
  installTimeMenu(game);
}
