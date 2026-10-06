import { isolateStorage } from "./memory-storage.mjs";

const demoBase = new URL("./", import.meta.url);
const gameBase = new URL("../../game3d/", import.meta.url);
const tell = (data) =>
  globalThis.parent.postMessage(
    { cameraDemo: true, ...data },
    globalThis.location.origin,
  );
try {
  isolateStorage(globalThis.window);
  const query = new URLSearchParams(globalThis.location.search);
  const places = ["plaza", "office", "dorms", "train"];
  const place = places.includes(query.get("place"))
    ? query.get("place")
    : "plaza";
  // Never forward arbitrary game flags, protagonist settings, scene IDs or a saved route.
  const params = new URLSearchParams({ cap: "1", place, q: "0" });
  if (place === "dorms") {
    params.set("mx", "-0.1");
    params.set("mz", "-0.2");
    params.set("face", String(Math.PI));
  }
  if (place === "train") params.set("face", String(Math.PI / 2));
  if (place === "office") {
    params.set("mx", "-0.2");
    params.set("mz", "-2.1");
    params.set("face", String(Math.PI));
  }
  globalThis.history.replaceState(
    null,
    "",
    `${globalThis.location.pathname}?${params}`,
  );
  let current;
  Object.defineProperty(globalThis.window, "__game", {
    get: () => current,
    set(game) {
      current = game;
      // CAP's initial settling frames must not start zone/near story triggers either.
      Object.defineProperty(game, "saveEnabled", {
        get: () => false,
        set() {},
      });
    },
  });
  const response = await fetch(new URL("index.html", gameBase));
  if (!response.ok) throw Error(`game shell returned ${response.status}`);
  const shell = new globalThis.DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  shell.querySelectorAll("script").forEach((script) => script.remove());
  globalThis.document.body.replaceChildren(...shell.body.childNodes);
  const base = globalThis.document.createElement("base");
  base.href = gameBase.href;
  globalThis.document.head.prepend(base);
  for (const sheet of [
    "style",
    "marks",
    "finds",
    "tickets",
    "settings",
    "saves",
    "vn",
    "clubs",
    "map",
  ]) {
    const link = globalThis.document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL(`css/${sheet}.css`, gameBase);
    globalThis.document.head.append(link);
  }
  const style = globalThis.document.createElement("style");
  style.textContent = `html,body { margin:0; height:100%; overflow:hidden; background:#172332; } #boot,#ui,#title,#build,#marks,.minimap { display:none!important; } #c { width:100%; height:100%; touch-action:none; }`;
  globalThis.document.head.append(style);
  const map = globalThis.document.createElement("script");
  map.type = "importmap";
  map.textContent = JSON.stringify({
    imports: {
      three: new URL("vendor/three/three.module.js", gameBase).href,
      "three/addons/": new URL("vendor/", gameBase).href,
    },
  });
  globalThis.document.head.append(map);
  globalThis.window.BUILD = "camera-review";
  await import(new URL("js/main.js", gameBase));
  const deadline = performance.now() + 90000;
  while (!globalThis.window.__done || !current?.place || !current?.walker) {
    if (performance.now() > deadline)
      throw Error("the game took too long to start");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const { installCamera } = await import(new URL("camera.mjs", demoBase));
  const { installControls } = await import(new URL("controls.mjs", demoBase));
  const camera = installCamera(current, query.get("camera"));
  const controls = installControls(current, camera, query.get("touch"));
  current.use = () => {};
  current.beat = async () => {};
  current.runner.trigger = () => {};
  current.busy = false;
  current.walker.locked = false;
  current.walker.sync();
  globalThis.window.__run = true;
  globalThis.window.__cameraDemo = { camera, controls, isolated: true };
  globalThis.addEventListener("message", (event) => {
    if (
      event.origin !== globalThis.location.origin ||
      event.source !== globalThis.parent ||
      !event.data?.cameraDemo
    )
      return;
    const { name, value } = event.data;
    if (name === "camera") camera.setMode(value);
    if (name === "touch") controls.setMode(value);
    if (name === "reset") camera.reset();
  });
  tell({ ready: true });
} catch (error) {
  console.error(error);
  tell({ error: error.message });
}
