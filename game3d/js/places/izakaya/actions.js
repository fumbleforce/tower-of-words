// Owned async work ends when its place leaves. A cancelled callback cannot touch a reused actor.
export function diningActions() {
  let generation = 0;
  const pending = new Set(),
    cancelled = Symbol('dinner cancelled');
  return {
    async run(fn) {
      const token = generation;
      const job = {
        live: () => token === generation,
        async wait(promise) {
          if (!job.live()) throw cancelled;
          let cancel;
          const stop = new Promise((_, reject) => {
            cancel = () => reject(cancelled);
            pending.add(cancel);
          });
          try {
            const result = await Promise.race([promise, stop]);
            if (!job.live()) throw cancelled;
            return result;
          } finally {
            pending.delete(cancel);
          }
        },
      };
      try {
        return await fn(job);
      } catch (error) {
        if (error !== cancelled) throw error;
      }
    },
    cancel() {
      generation++;
      for (const stop of pending) stop();
      pending.clear();
    },
  };
}
