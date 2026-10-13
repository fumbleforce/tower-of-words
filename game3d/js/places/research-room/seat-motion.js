// Research books remain in the hand while the player settles into or leaves a chair.
export function readingSeatMotion(game, seats = {}) {
  let owned = null;
  const pose = (node) => ({ position: node.position.clone(), quaternion: node.quaternion.clone() });
  async function change(job, apply) {
    const player = game.player,
      nodes = [];
    player.stepNow?.();
    player.root.traverse((node) => {
      if (node === player.root || node === player.model?.parent || node.isBone)
        nodes.push({ node, from: pose(node), fixed: !node.isBone });
    });
    apply();
    for (const item of nodes) {
      if (item.fixed) item.to = pose(item.node);
      item.node.position.copy(item.from.position);
      item.node.quaternion.copy(item.from.quaternion);
    }
    const motion = { job, nodes, k: 0 };
    owned = motion;
    try {
      await job.wait(
        game.tween(0.7, (k) => {
          if (job.live() && owned === motion) motion.k = k * k * (3 - 2 * k);
        }),
      );
      await job.wait(game.wait(50));
    } finally {
      if (owned === motion) owned = null;
    }
  }
  return {
    clear() {
      owned = null;
    },
    update() {
      if (!owned?.job.live()) return;
      game.player.stepNow?.();
      for (const { node, from, to, fixed } of owned.nodes) {
        const target = fixed ? to : pose(node);
        if (owned.k === 1) node.position.copy(target.position);
        else node.position.copy(from.position).lerp(target.position, owned.k);
        node.quaternion.copy(from.quaternion).slerp(target.quaternion, owned.k);
        // The walker writes Euler y only. Keep the root's equivalent yaw-only form.
        if (node === game.player.root) node.rotation.set(0, 2 * Math.atan2(node.quaternion.y, node.quaternion.w), 0);
      }
      game.player.root.updateWorldMatrix(true, true);
    },
    sit(job, seat) {
      return change(job, () => {
        const p = game.player;
        p.sitAt(seat.x, seat.top, seat.z, seat.ry || 0);
        p.seated = true;
        p.seatOut = seat.out;
        p.freeSeat = null;
        if (game.walker) game.walker.facing = seat.ry || 0;
      });
    },
    stand(job) {
      const p = game.player,
        out = p.seatOut ||
          Object.values(seats).find((seat) => Math.hypot(p.root.position.x - seat.x, p.root.position.z - seat.z) < 0.03)
            ?.out || [p.root.position.x, p.root.position.z];
      return change(job, () => {
        p.seated = false;
        p.seatOut = null;
        p.freeSeat = null;
        p.setState('idle');
        p.root.position.set(out[0], 0, out[1]);
      });
    },
  };
}
