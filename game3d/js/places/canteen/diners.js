import { faceRig } from '../../move.js';
export function canteenDiners(game, P, props, hands, frame, flags) {
  const key = (who) => (who.startsWith('canteen_') ? who : 'canteen_' + who);
  const rig = (who) => P.people[key(who)];
  const item = (who) => props[who.replace('canteen_', '')];
  async function point(job, who, to, id = 'diner-point') {
    await hands.pointAt(job, rig(who), to, id);
  }
  return {
    restore() {
      const box = props.container;
      if (flags.canteen_container_closed === false) {
        P.space.add(box.lid);
        box.lid.position.set(-5.78, 0.635, -1.35);
      } else {
        box.root.add(box.lid);
        box.lid.position.set(0, 0.094, 0);
      }
    },
    async act(job, { state, who = 'shirt' }) {
      const r = rig(who);
      if (state === 'frame') {
        frame(who);
        await job.wait(faceRig(game, r, [game.player.root.position.x, game.player.root.position.z]));
        await job.wait(game.wait(400));
      } else if (state === 'seatPoint') {
        const seat = P.seats.canteen_seat_shared;
        await job.wait(faceRig(game, game.player, [seat.x, seat.z]));
        await hands.pointAt(job, game.player, [seat.x, 0.6, seat.z], 'player-seat-point');
      } else if (state === 'makeRoom') {
        // He draws his elbow toward his own tray; the opposite chair was always physically usable.
        await point(job, 'shirt', [-9.65, 0.72, -4.48]);
      } else if (state === 'dishPoint') {
        const at = P.canteenDining.playerTrayPoint();
        if (at) await point(job, who, at, 'actual-player-dish');
      } else if (state === 'ownDish' || state === 'recommendationPoint') {
        const p = item(who).root.position;
        await point(job, who, [p.x, p.y + 0.12, p.z]);
      } else if (state === 'badgePoint') {
        await point(job, 'shirt', hands.point(props.badge).addScalar(0).toArray());
      } else if (state === 'containerPoint') {
        await point(job, 'cardigan', hands.point(props.container.root).toArray());
      } else if (state === 'containerOpen' || state === 'containerClose') {
        await job.wait(faceRig(game, rig('cardigan'), [-5.45, -1.65]));
        const box = props.container,
          at = hands.point(box.lid).add({ x: 0, y: 0, z: 0.09 });
        const closed = state === 'containerClose';
        await hands.reach(job, rig('cardigan'), at.toArray(), {
          item: box.lid,
          grip: [0, 0, 0.09],
          end: closed ? [-5.52, 0.719, -1.26] : [-5.78, 0.635, -1.26],
          id: 'container-lid',
        });
        flags.canteen_container_closed = closed;
      } else if (state === 'displayPoint') {
        // The side dish remains visible after the separate rice container closes.
        const p = props.cardigan.root.position;
        await point(job, 'cardigan', [p.x, p.y + 0.12, p.z]);
      } else if (state === 'exitPoint') {
        await point(job, 'polo', [8.05, 0.9, -4.0]);
        await job.wait(faceRig(game, rig('polo'), [P.start[0], 0]));
      } else if (state === 'wrapper') {
        await job.wait(faceRig(game, rig('polo'), [8.05, -4.25]));
        const at = hands.point(props.wrapper).add({ x: 0, y: 0, z: -0.05 });
        await hands.reach(job, rig('polo'), at.toArray(), {
          item: props.wrapper,
          grip: [0, 0, -0.05],
          end: [8.2, 0.632, -4.64],
          id: 'wrapper-fold',
        });
      } else throw Error('Unknown canteen diner action ' + state);
    },
  };
}
