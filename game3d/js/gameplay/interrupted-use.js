// A story may interrupt a walk to an interaction. Resume only the original unfinished request.
export function resumeInterruptedUse(game, use) {
  // a scene that starts while he walks to something he clicked (a zone he crossed, a queued event) stops that walk: he
  // carries on to it once the scenes are over, unless the scene that click was for has already run and done the job.
  // What Talk does on the target by then is read again on arrival, so a scene that moves it on doesn't cancel the walk.
  let cutUse = null;
  const onNode = game.onNode;
  game.onNode = (node, phase) => {
    if (phase === 'end' && cutUse?.node === node && cutUse.place === game.place && cutUse.story === game.story)
      cutUse = null;
    onNode?.(node, phase);
  };
  const beat = game.beat;
  game.beat = async function (fn) {
    if (this.busy || this.runner?.recoveryError) return beat.call(this, fn);
    if (this.walker.arrive?.use) cutUse = this.walker.arrive.use;
    const place = this.place;
    await beat.call(this, fn);
    if (!cutUse || this.busy) return; // a queued scene carries it on
    const u = cutUse;
    cutUse = null;
    if (
      this.place === place &&
      this.place === u.place &&
      this.story === u.story &&
      !this.walker.path &&
      this.markers.list.includes(u.item) &&
      u.item.enabled()
    )
      use(u.item, u.options);
  };
  return {
    clear() {
      cutUse = null;
    },
    request(item, options) {
      return {
        item,
        options,
        place: game.place,
        story: game.story,
        node: game.runner.resolve(options.trigger || 'talk:' + item.id, { peek: true }),
      };
    },
  };
}
