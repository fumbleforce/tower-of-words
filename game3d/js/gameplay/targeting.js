// Each frame: the nearest usable thing (what E, Space and Enter use), the Say target, and the near: triggers.
// main.js's step() calls this, then lets a target the player chose with Tab hold over it.
import { bodies } from '../move.js';
import { known } from '../lang.js';

export function scanTargets(game, nearSet) {
  const place = game.place;
  const eric = game.player;
  let near = null,
    nd = 0.95,
    st = null,
    sd = 2.2;
  // seated he can reach a bit further (his seat spot is not the bench edge), but not across the carriage
  const seatedReach = eric.seated ? 0.35 : 0;
  const mp = eric.root.position;
  // people are in reach within talking range of the person, from any side (not only at their one marker spot)
  const who = new Map();
  for (const b of bodies(game)) who.set(b.id, b);
  const talkR = 0.8 * (place.charScale || 1);
  for (const m of game.markers.list) {
    if (!m.enabled()) continue;
    const s = m.spot ? m.spot() : null;
    if (!s) continue;
    const d = Math.hypot(mp.x - s[0], mp.z - s[1]);
    const b = /person/.test(m.kind || '') && who.get(m.id);
    const dr =
      b && b.root !== eric.root ? Math.min(d, Math.max(0, Math.hypot(mp.x - b.x, mp.z - b.z) - talkR) + 0.3) : d;
    const goal = !!(m.goal && m.goal());
    const dn = dr - (goal ? 0.3 : 0) + (m.nearOnly?.() ? 0.4 : 0); // close-only things lose close calls
    // the current goal in reach wins over anything closer (QA round 1: E picked the reader next to Mio; Jørgen,
    // 2026-10-04: in the machine room E always gave Mio or the cat, never what the scene needed)
    const rank = dn - seatedReach - (goal ? 9 : 0);
    if (!game.busy && dn < 0.95 + seatedReach && rank < nd) {
      nd = rank;
      near = m;
    }
    const bias = (goal ? -1.2 : 0) + (/person/.test(m.kind || '') ? -0.7 : 0) + (m.wordable && m.wordable() ? -0.6 : 0);
    // Say works on what's in reach; goals and people win over things when several are close
    if (!game.busy && known.size && d < 1.6 + seatedReach && d + bias < sd) {
      sd = d + bias;
      st = m;
    }
    if (d < 0.9) {
      if (!nearSet.has(m.id) && !game.busy) {
        nearSet.add(m.id);
        game.runner.trigger('near:' + m.id);
      }
    } else if (d > 1.3) nearSet.delete(m.id);
  }
  return { near, st };
}
