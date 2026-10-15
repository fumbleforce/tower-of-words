// Keep the approach scene in control until the moving train actually stops.
// This wait belongs to one place instance, never to a save or a timer.
export function trainArrival(st) {
  let pending = null,
    resolve = null,
    left = false;
  const finish = (result) => {
    const done = resolve;
    resolve = pending = null;
    done?.(result);
  };
  return {
    begin(start) {
      if (left) return { worldComplete: false };
      if (st.arrived) return;
      if (!pending) {
        pending = new Promise((done) => {
          resolve = done;
        });
        try {
          start();
        } catch (error) {
          finish({ worldComplete: false });
          throw error;
        }
      }
      return pending;
    },
    stopped() {
      finish();
    },
    leave() {
      left = true;
      finish({ worldComplete: false });
    },
  };
}
