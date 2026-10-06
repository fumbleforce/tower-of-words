const frame = globalThis.document.querySelector("#world");
const status = globalThis.document.querySelector("#status");
const place = globalThis.document.querySelector("#place");
const camera = globalThis.document.querySelector("#camera");
const scene = globalThis.document.querySelector("#scene");
const sceneNote = globalThis.document.querySelector("#scene-note");
const mobile = globalThis.matchMedia("(pointer: coarse)").matches;
const query = new URLSearchParams(globalThis.location.search);
for (const control of [place, camera]) {
  const value = query.get(control.id);
  if ([...control.options].some((option) => option.value === value))
    control.value = value;
}
function load() {
  status.hidden = false;
  status.textContent = `Loading ${place.selectedOptions[0].textContent}…`;
  const url = new URL("frame.html", import.meta.url);
  url.search = new URLSearchParams({
    cap: "1",
    place: place.value,
    camera: camera.value,
  });
  scene.textContent = "Preview scene camera";
  sceneNote.textContent =
    "Scene preview: frames two nearby characters without moving them.";
  frame.src = url.href;
}
function command(name, value) {
  frame.contentWindow.postMessage(
    { cameraDemo: true, name, value },
    globalThis.location.origin,
  );
}
place.addEventListener("change", load);
camera.addEventListener("change", () => {
  command("camera", camera.value);
  scene.disabled = camera.value === "overview";
  frame.focus();
});
scene.addEventListener("click", () => {
  command("scene");
  frame.focus();
});
globalThis.document.querySelector("#reset").addEventListener("click", () => {
  command("reset");
  frame.focus();
});
globalThis.addEventListener("message", (event) => {
  if (
    event.origin !== globalThis.location.origin ||
    event.source !== frame.contentWindow ||
    !event.data?.cameraDemo
  )
    return;
  if (event.data.ready) {
    status.hidden = true;
    command("camera", camera.value);
    scene.disabled = mobile || camera.value === "overview";
  }
  if ("scene" in event.data) {
    scene.textContent = event.data.scene
      ? "Return to walking"
      : "Preview scene camera";
    globalThis.document.querySelector("#reset").disabled =
      !!event.data.scene || mobile;
    sceneNote.textContent = event.data.scene
      ? `Scene preview: ${event.data.scene}. Movement paused; no dialogue is playing.`
      : event.data.unavailable
        ? "No nearby pair here. Try the B2 office or train."
        : "Scene preview: frames two nearby characters without moving them.";
  }
  if (event.data.error) {
    status.hidden = false;
    status.textContent = `Could not load this place: ${event.data.error}. Choose another place or reload to retry.`;
  }
});
if (mobile) {
  camera.value = "overview";
  camera.disabled = true;
  scene.hidden = true;
  sceneNote.hidden = true;
  globalThis.document.querySelector("#reset").hidden = true;
  globalThis.document.querySelector("#mobile-note").hidden = false;
  globalThis.document.querySelector("#hint").textContent =
    "Overview · tap or hold to walk";
}
load();
