// Keep ambient speech above an open conversation, including portraits that cross its width.
let installed = false;
let avoidBoxes = () => [];
export function setCaptionAvoid(fn) {
  avoidBoxes = fn;
}
export function installCaptionLayout() {
  if (installed) return;
  installed = true;
  const caption = document.getElementById('caption');
  const talk = document.getElementById('talk');
  const stage = document.getElementById('stage');
  let frame = 0;
  function layout() {
    frame = 0;
    if (caption.hidden || talk.hidden) {
      caption.style.removeProperty('--caption-bottom');
      return;
    }
    const box = caption.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    let top = talk.getBoundingClientRect().top;
    for (const portrait of stage.querySelectorAll('.por:not([hidden]):not(.aside)')) {
      if (stage.hidden) break;
      const bounds = portrait.getBoundingClientRect();
      // The listening portrait scales down. Reserve its full box while it grows back on a speaker change.
      const left = Math.min(bounds.left, stageBox.left + portrait.offsetLeft);
      const right = Math.max(bounds.right, stageBox.left + portrait.offsetLeft + portrait.offsetWidth);
      if (right > box.left && left < box.right) top = Math.min(top, bounds.top, stageBox.top + portrait.offsetTop);
    }
    // Large reply lists can lift the caption into the player's head. Reuse the prompt's projected character bounds.
    for (const keep of avoidBoxes().sort((a, b) => b.y0 - a.y0)) {
      if (box.left < keep.x1 && box.right > keep.x0 && top - 12 > keep.y0 && top - 12 - box.height < keep.y1) {
        top = keep.y0;
      }
    }
    const zoom = parseFloat(getComputedStyle(caption).zoom) || 1;
    const bottom = `${(innerHeight - top + 12) / zoom}px`;
    if (caption.style.getPropertyValue('--caption-bottom') !== bottom) {
      caption.style.setProperty('--caption-bottom', bottom);
    }
    schedule(); // follow the camera only while both pieces of text are on screen
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout);
  }
  const resize = new ResizeObserver(schedule);
  resize.observe(talk);
  resize.observe(caption);
  const changes = new MutationObserver(schedule);
  for (const element of [talk, stage, caption]) {
    changes.observe(element, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
  addEventListener('resize', schedule);
}
