import { attachSender } from '../investigations/sender/index.js';
import { attachMioLunch } from './mio-lunch/index.js';
import { attachResearchOffice } from './research-room/office.js';

export function attachOfficeActivities(game, place, world) {
  attachSender(game, place, world);
  attachMioLunch(game, place);
  attachResearchOffice(game, place);
}
