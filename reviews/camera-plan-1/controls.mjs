export function installControls(game, camera, initial) {
  const canvas = globalThis.document.querySelector("#c");
  let mode = ["2a", "2b", "2c"].includes(initial) ? initial : "2a";
  const pointers = new Map();
  let looking = false,
    last = null,
    pinch = 0;
  const style = globalThis.document.createElement("style");
  style.textContent = `
    .demo-stick,.demo-strip { position:fixed; z-index:100; touch-action:none; user-select:none; color:white; font:13px system-ui; border:1px solid #ffffff99; background:#172332b8; }
    .demo-stick { bottom:20px; left:18px; width:104px; height:104px; border-radius:50%; display:grid; place-items:center; }
    .demo-stick i { position:absolute; width:40px; height:40px; border-radius:50%; background:#9edcd0aa; pointer-events:none; }
    .demo-stick span { position:absolute; top:-24px; }
    .demo-strip { bottom:12px; left:15%; width:70%; height:56px; border-radius:8px; display:grid; place-items:center; }
    .demo-stick[hidden],.demo-strip[hidden] { display:none; }
  `;
  globalThis.document.head.append(style);
  const stick = globalThis.document.createElement("div");
  stick.className = "demo-stick";
  stick.setAttribute("aria-label", "Drag to walk");
  stick.innerHTML = "<span>Walk</span><i></i>";
  const strip = globalThis.document.createElement("div");
  strip.className = "demo-strip";
  strip.textContent = "Drag here to look";
  strip.setAttribute("aria-label", "Drag to look");
  globalThis.document.body.append(stick, strip);
  const keys = ["KeyW", "KeyS", "KeyA", "KeyD"];
  function stop() {
    game.walker.keys.clear();
    game.walker.stop();
    stickId = null;
    looking = false;
    pointers.clear();
    last = null;
    pinch = 0;
    stick.querySelector("i").style.transform = "";
  }
  function setMode(value) {
    if (!["2a", "2b", "2c"].includes(value)) return;
    stop();
    mode = value;
    stick.hidden = mode !== "2b";
    strip.hidden = mode !== "2c";
  }
  const center = () => {
    const points = [...pointers.values()];
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
  };
  const spread = () => {
    const p = [...pointers.values()];
    return p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  };
  function moveStick(event) {
    const rect = stick.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2,
      dy = event.clientY - rect.top - rect.height / 2;
    keys.forEach((key) => game.walker.keys.delete(key));
    if (dy < -12) game.walker.keys.add("KeyW");
    if (dy > 12) game.walker.keys.add("KeyS");
    if (dx < -12) game.walker.keys.add("KeyA");
    if (dx > 12) game.walker.keys.add("KeyD");
    const k = Math.min(1, 32 / (Math.hypot(dx, dy) || 1));
    stick.querySelector("i").style.transform =
      `translate(${dx * k}px,${dy * k}px)`;
  }
  let stickId = null;
  globalThis.addEventListener(
    "pointerdown",
    (event) => {
      if (stick.contains(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stickId = event.pointerId;
        stick.setPointerCapture(event.pointerId);
        moveStick(event);
        return;
      }
      if (event.target !== canvas && event.target !== strip) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const shouldLook =
        event.button === 2 ||
        event.target === strip ||
        (event.pointerType === "touch" && (mode === "2b" || pointers.size > 1));
      if (shouldLook) {
        event.preventDefault();
        event.stopImmediatePropagation();
        looking = true;
        game.walker.stop();
        // Cancel the first finger's native hold-to-steer before a second finger takes over looking.
        for (const pointerId of pointers.keys()) {
          const cancel = new globalThis.PointerEvent("pointercancel", {
            pointerId,
          });
          cancel.cameraCancel = true;
          globalThis.dispatchEvent(cancel);
        }
        last = center();
        pinch = spread();
      }
    },
    true,
  );
  globalThis.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerId === stickId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        moveStick(event);
        return;
      }
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!looking) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = center(),
        gap = spread();
      if (last) camera.look(next.x - last.x, next.y - last.y);
      if (gap && pinch) camera.zoom((pinch - gap) * 4);
      pinch = gap;
      last = next;
    },
    true,
  );
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    globalThis.addEventListener(
      type,
      (event) => {
        if (event.cameraCancel) return;
        if (event.pointerId === stickId) {
          keys.forEach((key) => game.walker.keys.delete(key));
          stickId = null;
          stick.querySelector("i").style.transform = "";
          return;
        }
        pointers.delete(event.pointerId);
        if (!pointers.size) {
          looking = false;
          last = null;
          pinch = 0;
        } else {
          last = center();
          pinch = spread();
        }
      },
      true,
    );
  globalThis.addEventListener("contextmenu", (event) => event.preventDefault());
  globalThis.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      camera.zoom(event.deltaY);
    },
    { capture: true, passive: false },
  );
  globalThis.addEventListener("blur", stop);
  globalThis.document.addEventListener(
    "visibilitychange",
    () => globalThis.document.hidden && stop(),
  );
  // Other game shortcuts could open a story panel. The demo exposes movement only.
  globalThis.addEventListener(
    "keydown",
    (event) => {
      if (/^(Arrow|Key[WASD]$|Shift|CapsLock)/.test(event.code)) return;
      if (event.code === "Tab") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  setMode(mode);
  return {
    setMode,
    get mode() {
      return mode;
    },
  };
}
