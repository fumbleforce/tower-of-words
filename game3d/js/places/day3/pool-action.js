// A pool choreography stops when its place is left, including waits already in flight.
const CANCELLED = Symbol('pool action cancelled');
export function poolAction(game) {
  let current = null;
  const alive = (token) => token && token.active && game.place === token.place;
  return {
    async run(action) {
      this.cancel();
      let cancel;
      const token = {
        active: true,
        place: game.place,
        signal: new Promise((resolve) => {
          cancel = resolve;
        }),
        cancel: () => cancel(CANCELLED),
      };
      current = token;
      try {
        return await action();
      } catch (error) {
        if (error !== CANCELLED) throw error;
      } finally {
        if (current === token) current = null;
      }
    },
    async wait(promise) {
      const token = current;
      if (!alive(token)) throw CANCELLED;
      const result = await Promise.race([promise, token.signal]);
      if (result === CANCELLED || !alive(token)) throw CANCELLED;
      return result;
    },
    tween(duration, step) {
      const token = current;
      return game.tween(duration, (k) => {
        if (alive(token)) step(k);
      });
    },
    cancel() {
      if (current) {
        current.active = false;
        current.cancel();
        current = null;
      }
    },
  };
}
