import * as THREE from "three";

// Review adapter: retain the production walker's collision, gait and running.
// Requested camera yaw supplies movement, never the avatar's turn or wall-clamped lens.
export function installControls(game, camera) {
  const document = globalThis.document;
  const canvas = document.querySelector("#c");
  canvas.tabIndex = 0;
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
  const panel = document.createElement("div");
  panel.id = "demo-play";
  panel.innerHTML =
    '<button type="button">Play · capture mouse</button><p>Move the mouse to look · WASD to move · Shift to run<br>Esc releases the mouse for camera and scene controls</p>';
  const style = document.createElement("style");
  style.textContent = `#demo-play { position:fixed; inset:0; z-index:100; display:grid; place-content:center; text-align:center; background:#101c2955; color:white; font:15px system-ui; } #demo-play[hidden] { display:none; } #demo-play button { justify-self:center; border:1px solid #a4d9d1; border-radius:6px; background:#116c66; color:white; font:600 18px system-ui; padding:14px 24px; cursor:pointer; } #demo-play p { padding:12px; background:#172332eb; border-radius:6px; line-height:1.65; }`;
  document.head.append(style);
  document.body.append(panel);
  let lookReady = false;
  // camera.look uses the former drag scale; captured look is 0.003 rad/pixel.
  const capturedLookScale = 0.375;
  const locked = () => document.pointerLockElement === canvas;
  const thirdPerson = () => camera.mode !== "overview";
  function refresh() {
    panel.hidden = !thirdPerson() || !!camera.scene || locked();
  }
  function stop() {
    walker.keys.clear();
    walker.stop();
    walker.sync();
    walker.keyFrame = null;
    if (locked()) document.exitPointerLock();
    refresh();
  }
  function capture() {
    if (!thirdPerson() || camera.scene || locked()) return;
    canvas.focus();
    try {
      const request = canvas.requestPointerLock();
      request?.catch(() => {
        panel.querySelector("p").textContent =
          "Mouse capture was not available. Click Play to try again.";
        refresh();
      });
    } catch {
      panel.querySelector("p").textContent =
        "This browser could not capture the mouse. Try a desktop browser with pointer lock support.";
    }
  }
  panel.querySelector("button").addEventListener("click", capture);
  document.addEventListener("pointerlockchange", () => {
    lookReady = locked();
    if (!locked()) stop();
    refresh();
  });
  document.addEventListener("pointerlockerror", () => {
    panel.querySelector("p").textContent =
      "Mouse capture was not available. Click Play to try again.";
    refresh();
  });
  const consume = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  globalThis.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target !== canvas || !thirdPerson()) return;
      consume(event);
      if (event.button === 0) capture();
    },
    true,
  );
  globalThis.addEventListener(
    "mousemove",
    (event) => {
      if (!locked() || !lookReady || camera.scene) return;
      consume(event);
      // The entry warp can arrive before pointerlockchange acknowledges capture.
      camera.look(
        event.movementX * capturedLookScale,
        event.movementY * capturedLookScale,
      );
    },
    true,
  );
  globalThis.addEventListener(
    "contextmenu",
    (event) => thirdPerson() && event.preventDefault(),
  );
  globalThis.addEventListener(
    "wheel",
    (event) => {
      if (thirdPerson()) consume(event);
    },
    { capture: true, passive: false },
  );
  globalThis.addEventListener("blur", stop);
  document.addEventListener(
    "visibilitychange",
    () => document.hidden && stop(),
  );
  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (event.code === "Escape") {
        stop();
        return;
      }
      if (event.code === "Tab") return;
      if (
        !camera.scene &&
        (!thirdPerson() || locked()) &&
        /^(Arrow|Key[WASD]$|Shift|CapsLock)/.test(event.code)
      )
        return;
      // The play overlay remains keyboard operable without sending Enter to the game.
      if (
        panel.contains(event.target) &&
        ["Enter", "Space"].includes(event.code)
      ) {
        event.stopImmediatePropagation();
        if (!event.repeat) capture();
        return;
      }
      consume(event);
    },
    true,
  );
  refresh();
  return {
    stop,
    refresh,
    get locked() {
      return locked();
    },
  };
}
