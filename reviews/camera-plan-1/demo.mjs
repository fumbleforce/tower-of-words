const frame = globalThis.document.querySelector("#world");
const status = globalThis.document.querySelector("#status");
const place = globalThis.document.querySelector("#place");
const camera = globalThis.document.querySelector("#camera");
const touch = globalThis.document.querySelector("#touch");
const query = new URLSearchParams(globalThis.location.search);
for (const control of [place, camera, touch]) {
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
    touch: touch.value,
  });
  frame.src = url.href;
}
function command(name, value) {
  frame.contentWindow.postMessage(
    { cameraDemo: true, name, value },
    globalThis.location.origin,
  );
}
place.addEventListener("change", load);
camera.addEventListener("change", () => command("camera", camera.value));
touch.addEventListener("change", () => command("touch", touch.value));
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
    command("touch", touch.value);
  }
  if (event.data.error) {
    status.hidden = false;
    status.textContent = `Could not load this place: ${event.data.error}. Choose another place or reload to retry.`;
  }
});
if (globalThis.matchMedia("(pointer: coarse)").matches)
  globalThis.document.querySelector("#hint").textContent =
    "Choose your touch layout · open Controls for help";
load();
