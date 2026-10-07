// The office's conversation camera owns lens/direction restoration and save data.
export function senderCamera(game, place) {
  let shot = null;
  function focus(point, distance, y, yaw, elev, halfWidth = 1.15) {
    shot = { point, distance, y, yaw, elev, halfWidth };
    place.cam.closeOn(point, place.cam.fitDist / distance, y);
    place.cam.close.conversationShot = { yaw, elev, fov: 55, minDistance: distance, halfWidth };
    place.cam.snap(game.player.root.position);
  }
  return {
    focus,
    pair() {
      const a = place.people.mio.root.position,
        b = game.player.root.position;
      focus([a.x * 0.6 + b.x * 0.4, a.z * 0.6 + b.z * 0.4], 2.7, 0.65, 2.6, 0.3, 0.95);
      shot = { pair: true };
    },
    update() {},
    snapshot: () => (place.cam.close ? shot : null),
    load(saved) {
      shot = saved;
      if (saved?.pair) this.pair();
      else if (saved) focus(saved.point, saved.distance, saved.y, saved.yaw, saved.elev, saved.halfWidth);
    },
  };
}
