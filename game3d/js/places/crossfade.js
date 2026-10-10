// The soft crossfade between places (places/lifecycle.js travel()): the last frame of the old place, shown over the
// new one and faded out. The frame is copied into a canvas (#xfade, over the game canvas, under #fade) right after
// it's drawn, since the drawing buffer is only readable in the same task: a copy on the GPU, where encoding a JPEG
// (toDataURL) held that frame for 25 to 45 ms on entering the gate and the office.
function layer() {
  let c = document.getElementById('xfade');
  if (!c) {
    c = document.createElement('canvas');
    c.id = 'xfade';
    c.hidden = true;
    document.getElementById('fade').before(c);
  }
  return c;
}

// render: draws the current frame; canvas: the game's WebGL canvas
export function snapshot(render, canvas) {
  render();
  const c = layer();
  try {
    c.width = canvas.width;
    c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    return c;
  } catch {
    return null;
  }
}

export function crossfade(c) {
  if (!c) return;
  c.classList.remove('go');
  c.style.opacity = '1';
  c.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      c.classList.add('go');
      c.style.opacity = '0';
      setTimeout(() => {
        c.hidden = true;
      }, 1300);
    }),
  );
}
