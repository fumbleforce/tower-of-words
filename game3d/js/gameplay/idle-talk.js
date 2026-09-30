// People are always there to talk to (Jørgen, 2026-09-30: "All people should always be interactable, but dont
// necessarily need to say that much interesting"). When no talk:<id> entry holds for a person right now, talking to
// them runs their `idle:<id>` trigger, and with none of those holding they turn to Eric and nod. The contract is in
// game3d/story/FORMAT.md (Triggers, idle:).

// a person with a body in this place (the cat counts: she has her own talk everywhere), or a background one (extras)
const rigOf = (game, id) => game.place?.people[id] || game.place?.extras?.[id];
export const isPerson = (game, item) => /person/.test(item.kind || '') && !!rigOf(game, item.id);

export function idleTalk(game, id) {
  if (game.runner.trigger('idle:' + id)) return;
  const r = rigOf(game, id);
  // rigs that can nod do (chibis, Mio); anything else (the cat's plain model) gets a small bubble instead
  const nods = r && (r.arms || r.meshy || r.gesture);
  game.beat(() =>
    nods
      ? game.hooks.gesture({ who: id, kind: 'nod', to: 'eric' })
      : game.hooks.emote({ who: id, kind: '♪', ms: 1400 }),
  );
}
