// The shot list, in song order. Each shot: { id, t: [start, end), in: transition into it, scene3d(S, lt, T),
// draw(g, lt, T, S), fx(lt, T), bloom, exposure }; op.js plays them.
import { INTRO } from './intro.js';
import { VERSE } from './verse.js';
import { CHORUS } from './chorus.js';

export const SHOTS = [...INTRO, ...VERSE, ...CHORUS];
