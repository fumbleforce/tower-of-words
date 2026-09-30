// Held arm poses for Eric in the small evening scenes (the bicycle, the cat, the canteen chair), laid over whatever
// clip he is playing with his own pose layers (mio.js poseLayer): each is a set of arm bones turned forward about his
// side axis, eased in and out by the layer's weight and held for as long as it's on. A lean forward is his bow
// (avatar.js pose.bow). The code-built chibi fallback has neither, so these do nothing on it.
const NO_CLIP = { name: 'hold', duration: 0, tracks: [] };
const HOLDS = {
  // both hands out in front at waist height: a handlebar, the back of a chair
  reach: [
    ['RightArm', 0.95],
    ['LeftArm', 0.95],
    ['RightForeArm', 0.35],
    ['LeftForeArm', 0.35],
  ],
  // seated, hands lifted up and away from his lap
  clear: [
    ['RightArm', 0.55],
    ['LeftArm', 0.55],
    ['RightForeArm', 0.55],
    ['LeftForeArm', 0.55],
  ],
};

export function hold(player, kind, on) {
  const L = player?.layers;
  if (!L) return;
  const id = 'hold-' + kind;
  if (!L.layers[id]) L.add(id, NO_CLIP, 0, { lift: HOLDS[kind], rate: 3.2 });
  L.set(id, on);
}
export function letGo(player) {
  for (const kind of Object.keys(HOLDS)) hold(player, kind, false);
  if (player?.pose) player.pose.bow = 0;
}

// lean him forward to `to` (0 upright, 1 a deep bow) over `dur` seconds
export async function lean(game, to, dur = 0.5) {
  const pose = game.player?.pose;
  if (!pose) return;
  const from = pose.bow || 0;
  await game.tween(dur, (k) => {
    pose.bow = from + (to - from) * k * k * (3 - 2 * k);
  });
}
