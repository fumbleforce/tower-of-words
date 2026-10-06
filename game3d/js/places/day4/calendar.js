// The club's physical staging can be reused by a later Sunday's local story.
import { sim } from '../../sim.js';
export const isSunday = () => sim.day >= 4 && (sim.day - 4) % 7 === 0;
