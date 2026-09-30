// Long preparation work in slices, so a place built in the background never stalls the one being played.
// The work is written as a generator that `yield`s between steps (a room, a mesh, a few thousand vertices); a
// yield costs nothing unless the slice has run past its budget, then the rest waits for the next task and the
// frame gets drawn first.
//   drain(gen)            runs it all at once (tools, showcases, anything that wants the result now)
//   await sliced(gen)     runs it in slices of SLICE_MS; returns the generator's return value
//   await nextFrame()     a break in async code
//   yield* busyTime(gen)  inside a generator: { value, ms }, ms the time spent working (not waiting between slices)
// ?slice=<ms> changes the budget (0 runs everything in one task, the old way).
const Q = new URLSearchParams(globalThis.location?.search || '');
export const SLICE_MS = Q.has('slice') ? +Q.get('slice') : 8;

export function drain(gen) {
  let r;
  while (!(r = gen.next()).done);
  return r.value;
}

// While the player is playing, a slice runs once a frame: after SLICE_MS the work waits until the next frame has
// been drawn (rAF, then the next task), so the frame's own work always gets its turn. While the player is waiting
// for the work (nothing on screen yet, or the loading chip; setUrgent), it runs in slices of URGENT_MS back to back.
// rAF doesn't fire in a hidden tab: the wait then ends on a timer.
const URGENT_MS = 40;
let urgent = () => false;
export const setUrgent = (fn) => (urgent = fn);

let channel = null;
const waiting = [];
function nextTask() {
  if (!channel) {
    channel = new globalThis.MessageChannel();
    channel.port1.onmessage = () => waiting.shift()?.();
  }
  return new Promise((res) => {
    waiting.push(res);
    channel.port2.postMessage(0);
  });
}
const afterFrame = () =>
  new Promise((res) => {
    const t = setTimeout(res, 100);
    requestAnimationFrame(() => (clearTimeout(t), nextTask().then(res)));
  });

// a break between two steps of async work (a place's setup after its builder): the next frame, or the next task
// when the player is waiting
export const nextFrame = () => (!(SLICE_MS > 0) ? Promise.resolve() : urgent() ? nextTask() : afterFrame());

export async function sliced(gen, budget = SLICE_MS) {
  if (!(budget > 0)) return drain(gen);
  let t = performance.now(),
    r;
  while (!(r = gen.next()).done) {
    const now = performance.now(),
      hurry = urgent();
    if (now - t > (hurry ? URGENT_MS : budget)) {
      await (hurry ? nextTask() : afterFrame());
      t = performance.now();
    }
  }
  return r.value;
}

export function* busyTime(gen) {
  let ms = 0;
  for (;;) {
    const t = performance.now(),
      r = gen.next();
    ms += performance.now() - t;
    if (r.done) return { value: r.value, ms };
    yield;
  }
}
