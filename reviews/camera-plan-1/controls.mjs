import * as THREE from "three";

// Review adapter: keep the production walker's collision, gait and run behavior.
// Its movement basis comes from the requested view, never from the character's
// facing or a camera position displaced by an obstruction.
export function installControls(game, camera) {
  const canvas = globalThis.document.querySelector("#c");
  const walker = game.walker;
  const update = walker.update.bind(walker);
  const forward = new THREE.Vector3(),
    parentRotation = new THREE.Quaternion();
  walker.update = (dt, ...args) => {
    if (camera.mode !== "overview") {
      forward.set(Math.sin(camera.yaw), 0, Math.cos(camera.yaw));
      if (walker.body.parent) {
        walker.body.parent.getWorldQuaternion(parentRotation);
        forward.applyQuaternion(parentRotation.invert());
      }
      forward.y = 0;
      walker.keyFrame = forward.normalize();
    }
    return update(dt, ...args);
  };
  let drag = null;
  function stop() {
    walker.keys.clear();
    walker.stop();
    walker.keyFrame = null;
    drag = null;
  }
  const consume = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  globalThis.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target !== canvas || camera.mode === "overview") return;
      consume(event);
      canvas.focus();
      // Left click only focuses in third person, so hold-to-steer cannot compete with WASD.
      if (
        !camera.scene &&
        event.pointerType !== "touch" &&
        [1, 2].includes(event.button)
      ) {
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
      }
    },
    true,
  );
  globalThis.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      consume(event);
      camera.look(event.clientX - drag.x, event.clientY - drag.y);
      drag.x = event.clientX;
      drag.y = event.clientY;
    },
    true,
  );
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    globalThis.addEventListener(
      type,
      (event) => {
        if (event.pointerId === drag?.id) {
          consume(event);
          drag = null;
        }
      },
      true,
    );
  globalThis.addEventListener("contextmenu", (event) => event.preventDefault());
  globalThis.addEventListener(
    "wheel",
    (event) => {
      consume(event);
      camera.zoom(event.deltaY);
    },
    { capture: true, passive: false },
  );
  globalThis.addEventListener("blur", stop);
  globalThis.document.addEventListener(
    "visibilitychange",
    () => globalThis.document.hidden && stop(),
  );
  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (event.code === "Tab") return;
      if (
        !camera.scene &&
        /^(Arrow|Key[WASD]$|Shift|CapsLock)/.test(event.code)
      )
        return;
      consume(event);
    },
    true,
  );
  return { stop };
}
