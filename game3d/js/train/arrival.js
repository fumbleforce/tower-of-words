// Keep the approach scene in control until the moving train actually stops.
// This wait belongs to one place instance, never to a save or a timer.
export function trainArrival(st, isCurrent = () => true) {
  let pending = null,
    resolve = null;
  const finish = (result) => {
    const done = resolve;
    resolve = pending = null;
    done?.(result);
  };
  return {
    begin(start) {
      if (!isCurrent()) return { worldComplete: false };
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
      finish({ worldComplete: false });
    },
  };
}
