import * as THREE from 'three';
import { paperMesh } from '../../scenes/research-room/books.js';
// The owned sheet comes out at the player's hand and returns there; the volume stays in the room.
export function referenceCopy(game, P, hands, transfer) {
  const prop = new THREE.Group();
  prop.name = 'research-owned-mori-copy';
  prop.add(paperMesh('mori-copy', 0.24));
  prop.visible = false;
  P.space.add(prop);
  const at = [-0.26, 0.636, -1.32];
  const localHand = (s) => P.space.worldToLocal(s.hand.getWorldPosition(new THREE.Vector3()));
  async function stow(job) {
    if (!prop.visible) return;
    await transfer.take(job, prop, 'owned-copy', 'Left');
    const s = hands.start(game.player, 'Left'),
      p = game.player.root.position;
    try {
      await job.wait(hands.move(s, [p.x - 0.15, p.y + 0.45, p.z]));
      await job.wait(game.wait(200));
      prop.visible = false;
      P.space.attach(prop);
    } finally {
      hands.stop(s);
    }
  }
  return {
    prop,
    snapshot: () => prop.visible && prop.parent === P.space,
    restore(visible) {
      P.space.attach(prop);
      prop.position.set(...at);
      prop.rotation.set(0, 0, 0);
      prop.visible = visible === true;
    },
    clear() {
      prop.visible = false;
      P.space.attach(prop);
    },
    async show(job) {
      if (prop.visible) return;
      const s = hands.start(game.player, 'Left');
      try {
        const p = game.player.root.position;
        await job.wait(hands.move(s, [p.x - 0.15, p.y + 0.45, p.z]));
        P.space.attach(prop);
        prop.position.copy(localHand(s));
        prop.rotation.set(0, 0, 0);
        prop.visible = true;
        s.hand.attach(prop);
        await job.wait(game.wait(200));
      } finally {
        hands.stop(s);
      }
      await transfer.place(job, prop, at, 'owned-copy', 0, 'Left');
      P.space.attach(prop);
      prop.position.set(...at);
      prop.rotation.set(0, 0, 0);
    },
    stow,
  };
}
