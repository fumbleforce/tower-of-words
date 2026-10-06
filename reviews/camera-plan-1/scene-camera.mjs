import * as THREE from "three";

// A framing demonstration only: no scene scripts, dialogue or actor repositioning.
export function createSceneShot(game, obstruction, constrain) {
  const camera = game.place.camera;
  const visible = (root) => {
    let node = root;
    for (; node; node = node.parent) {
      if (!node.visible) return false;
      if (node === game.place.scene) return true;
    }
    return false;
  };
  const seen = new Set();
  const people = Object.entries({
    Player: game.player,
    Mio: game.mioNpc,
    ...game.place.people,
  })
    .filter(([id, person]) => {
      if (
        !person?.root ||
        /tama|kitty|cat/i.test(id) ||
        seen.has(person.root) ||
        !visible(person.root)
      )
        return false;
      seen.add(person.root);
      return true;
    })
    .map(([id, person]) => ({
      name: (id === "kuroda" ? "Hamada" : id)
        .replaceAll("_", " ")
        .replace(/^./, (s) => s.toUpperCase()),
      root: person.root,
      head:
        person.head ||
        (() => {
          let head;
          person.root.traverse((object) => {
            if (!head && object.isBone && /head$/i.test(object.name))
              head = object;
          });
          return head;
        })(),
      focus: new THREE.Vector3(),
      position: person.root.getWorldPosition(new THREE.Vector3()),
    }));
  // A nearby pair can include the player, but the player is not the camera anchor.
  let pair = null,
    distance = Infinity;
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++) {
      const d = people[i].position.distanceTo(people[j].position);
      if (d < distance) {
        distance = d;
        pair = [people[i], people[j]];
      }
    }
  if (!pair || distance > 6) return null;
  const midpoint = new THREE.Vector3(),
    axis = new THREE.Vector3(),
    offset = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const previous = camera.position.clone();
  let side = 1;
  axis.subVectors(pair[1].position, pair[0].position).setY(0).normalize();
  offset.set(-axis.z, 0, axis.x);
  midpoint.copy(pair[0].position).add(pair[1].position).multiplyScalar(0.5);
  if (offset.dot(previous.sub(midpoint)) < 0) side = -1;
  return {
    label: pair.map((p) => p.name).join(" + "),
    update() {
      for (const person of pair) person.root.getWorldPosition(person.position);
      for (const person of pair) {
        if (person.head) person.head.getWorldPosition(person.focus);
        else
          person.focus
            .copy(person.position)
            .add(new THREE.Vector3(0, 0.8 * (game.place.charScale || 1), 0));
      }
      midpoint.copy(pair[0].focus).add(pair[1].focus).multiplyScalar(0.5);
      midpoint.y -= 0.1 * (game.place.charScale || 1);
      axis.subVectors(pair[1].position, pair[0].position).setY(0).normalize();
      offset.set(-axis.z, 0, axis.x).multiplyScalar(side);
      const halfWidth =
        pair[0].position.distanceTo(pair[1].position) / 2 + 0.45;
      const back =
        Math.max(
          1.8,
          halfWidth /
            (Math.tan(THREE.MathUtils.degToRad(38 / 2)) * camera.aspect),
        ) + 0.4;
      desired.copy(midpoint).addScaledVector(offset, back);
      desired.y += 0.35;
      constrain(desired);
      obstruction(midpoint, desired);
      camera.position.copy(desired);
      camera.fov = 38;
      camera.near = 0.06;
      camera.updateProjectionMatrix();
      camera.lookAt(midpoint);
      camera.updateMatrixWorld();
    },
  };
}
