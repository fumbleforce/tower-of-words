// Background people as things to talk to (#106; Jørgen, 2026-09-30: "All people should always be interactable"):
// the gate's office workers. They stay out of the place's `people` (no saved positions, no story walks); the place
// lists them as `extras`, where the look, face and gesture hooks find them (narrative/hooks/targets.js), and talking
// to one runs its idle: line or a nod (gameplay/idle-talk.js).
// rigs: { id: rig }; standing(rig): whether they can be talked to now (a commuter only while waiting, never mid-walk).
// The place spreads each over its catalog entry, so its registrations stay explicit (tools/lib/place-source.mjs)
import { makePickable } from '../gameplay/pick-volumes.js';
export function backgroundThings(rigs, standing = () => true) {
  return Object.fromEntries(
    Object.entries(rigs).map(([id, r]) => {
      const p = r.root.position;
      makePickable(r.root, id); // a click anywhere on the body, not just the pin

      return [
        id,
        {
          anchor: (v) => {
            r.root.getWorldPosition(v);
            v.y += 1.25;
            return v;
          },
          spot: () => [p.x + Math.sin(r.root.rotation.y) * 0.6, p.z + Math.cos(r.root.rotation.y) * 0.6],
          face: () => [p.x, p.z],
          enabled: () => r.root.visible && standing(r),
        },
      ];
    }),
  );
}

// the gate's: the two office workers standing past the gate, and the three commuters while they stand waiting at the jam
export function gateBackground(extras, commuters) {
  const rigs = { worker_a: extras[0], worker_b: extras[1] };
  commuters.forEach((c, i) => (rigs['commuter_' + (i + 1)] = c.r));
  const waiting = (r) => {
    const c = commuters.find((q) => q.r === r);
    return !c || c.stage === 'queue' || c.stage === 'tapwait';
  };
  return { rigs, things: backgroundThings(rigs, waiting) };
}
