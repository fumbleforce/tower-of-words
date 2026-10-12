// A small picture of the world with no UI on it, as a JPEG data URL: the save thumbnails and the day's photos (menu.js).
//   import { grab } from './ui/frame-grab.js';   grab(w = 320, aspect = 1.6) -> Promise<dataURL | null>
// The canvas holds its picture only in the task that drew it, so the copy is taken right after a frame the game drew
// (perf/view.js afterDraw): an animation frame may be one the frame cap skipped, with nothing in the canvas to copy.
// The copy never makes the page wait for the GPU. The old way (drawImage into a 2D canvas, then toDataURL) waited for
// the GPU to finish the frame and read it back, then encoded on the main thread, and the photo of a place is often
// taken as Eric walks out of it, in the middle of the trip (notes/PERF.md, "Laptops without a graphics card"). Now,
// on WebGL2: the frame is scaled down on the GPU (a blit into a small buffer), copied into a pixel buffer there, and
// read once a fence says the GPU got that far; the JPEG is encoded from a canvas in memory, off the main thread.
const WAIT_MS = 500; // no frame drawn by then (no place yet, the map open): copy whatever the canvas holds

const asDataURL = (blob) =>
  new Promise((res) => {
    if (!blob) return res(null);
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => res(null);
    r.readAsDataURL(blob);
  });

// the centre of a w x h buffer cut to the aspect: [x, y, width, height]
function crop(W, H, aspect) {
  let sw = W,
    sh = W / aspect;
  if (sh > H) {
    sh = H;
    sw = sh * aspect;
  }
  return [Math.round((W - sw) / 2), Math.round((H - sh) / 2), Math.round(sw), Math.round(sh)];
}

// the frame just drawn, scaled to w x h, as RGBA rows from the top; null without WebGL2 or if the context goes
function gpuCopy(renderer, w, h, aspect) {
  const gl = renderer.getContext();
  if (typeof gl.fenceSync !== 'function' || gl.isContextLost()) return null;
  const [sx, sy, sw, sh] = crop(gl.drawingBufferWidth, gl.drawingBufferHeight, aspect);
  const rb = gl.createRenderbuffer(),
    fb = gl.createFramebuffer(),
    pbo = gl.createBuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
  gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); // the canvas
  gl.blitFramebuffer(sx, sy, sx + sw, sy + sh, 0, h, w, 0, gl.COLOR_BUFFER_BIT, gl.LINEAR); // flipped: rows from the top
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  renderer.resetState(); // three's record of what is bound, after the raw calls above
  const free = () => {
    gl.deleteSync(sync);
    gl.deleteBuffer(pbo);
    gl.deleteFramebuffer(fb);
    gl.deleteRenderbuffer(rb);
  };
  return new Promise((res) => {
    const poll = () => {
      if (gl.isContextLost()) return res(null);
      if (gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED) return void setTimeout(poll, 8);
      const px = new Uint8ClampedArray(w * h * 4);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      free();
      for (let i = 3; i < px.length; i += 4) px[i] = 255; // a JPEG has no alpha
      res(new ImageData(px, w, h));
    };
    setTimeout(poll, 0);
  });
}

// a JPEG of the pixels, encoded from a canvas in memory (no GPU behind it, so nothing to wait for)
function encode(image) {
  if (typeof OffscreenCanvas === 'function') {
    const oc = new OffscreenCanvas(image.width, image.height);
    oc.getContext('2d', { willReadFrequently: true }).putImageData(image, 0, 0);
    return oc.convertToBlob({ type: 'image/jpeg', quality: 0.74 }).then(asDataURL, () => null);
  }
  const cv = document.createElement('canvas');
  [cv.width, cv.height] = [image.width, image.height];
  cv.getContext('2d', { willReadFrequently: true }).putImageData(image, 0, 0);
  return new Promise((res) => cv.toBlob((b) => asDataURL(b).then(res), 'image/jpeg', 0.74));
}

// the old way, where there is no WebGL2: copied and encoded at once
function canvasCopy(w, h, aspect) {
  const c = document.querySelector('#c');
  if (!c || !c.width) return null;
  const cv = document.createElement('canvas');
  [cv.width, cv.height] = [w, h];
  const [sx, sy, sw, sh] = crop(c.width, c.height, aspect);
  cv.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', 0.74);
}

function copy(w, aspect, res) {
  const h = Math.round(w / aspect);
  try {
    const renderer = window.__game?.renderer;
    const pending = renderer && gpuCopy(renderer, w, h, aspect);
    if (pending) pending.then((img) => (img ? encode(img) : null)).then(res, () => res(null));
    else res(canvasCopy(w, h, aspect));
  } catch {
    res(null);
  }
}

export function grab(w = 320, aspect = 1.6) {
  return new Promise((res) => {
    let done = false;
    const take = () => {
      if (done) return;
      done = true;
      clearTimeout(late);
      copy(w, aspect, res);
    };
    const late = setTimeout(() => requestAnimationFrame(take), WAIT_MS);
    const view = window.__game?.view;
    if (view?.afterDraw) view.afterDraw(take);
    else setTimeout(() => requestAnimationFrame(take), 0);
  });
}
