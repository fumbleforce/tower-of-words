// Observation for refactor comparisons. No simulation callback is replaced.
export function installBehaviorTrace({ seed }) {
  let random = seed >>> 0;
  Math.random = () => {
    random = (random + 0x6d2b79f5) >>> 0;
    let value = Math.imul(random ^ (random >>> 15), 1 | random);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const trace = { events: [], saves: [], initialStorage: { ...localStorage } };
  let sequence = 0;
  window.__behaviorTrace = trace;
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const result = setItem.apply(this, arguments);
    if (this === localStorage && key === 'amakawa-day1-save') trace.saves.push({ sequence: sequence++, json: String(value) });
    return result;
  };
  Object.defineProperty(window, '__game', {
    configurable: true,
    set(value) {
      const game = value;
      Object.defineProperty(window, '__game', { value, writable: true, configurable: true, enumerable: true });
      const record = event => trace.events.push({ sequence: sequence++, ...event, place: game.place?.name || null,
        flags: { ...game.flagsRef } });
      // Capture the actual rendered text after synchronous UI setup, including
      // promise-returning prompts. Do not await, replace or settle their promises.
      const panels = { say: '#talk', choose: '#talk', typePrompt: '#talk', caption: '#caption',
        goal: '#goal', board: '#board', hint: '#hint', toast: '#toast', showEnd: '#end', clock: '#clock' };
      for (const [method, selector] of Object.entries(panels)) {
        const original = game.ui?.[method];
        if (typeof original !== 'function') continue;
        game.ui[method] = function () {
          const result = original.apply(this, arguments);
          const element = document.querySelector(selector);
          record({ kind: 'presentation', method, panel: selector,
            hidden: element?.hidden ?? null, text: element?.textContent ?? null });
          return result;
        };
      }
      const onNode = game.onNode, onTrigger = game.onTrigger;
      game.onNode = function (node, phase) {
        record({ kind: 'node', node, phase });
        return onNode?.apply(this, arguments);
      };
      game.onTrigger = function (key) {
        record({ kind: 'trigger', key });
        return onTrigger?.apply(this, arguments);
      };
      let runner = game.runner;
      Object.defineProperty(game, 'runner', {
        configurable: true, enumerable: true,
        get: () => runner,
        set(next) {
          runner = next;
          const entry = runner.entry;
          runner.entry = function (key, options) {
            const result = entry.apply(this, arguments);
            if (!options?.peek) record({ kind: 'resolution', key, matched: result?.node || null });
            return result;
          };
        },
      });
      let place = game.place;
      Object.defineProperty(game, 'place', {
        configurable: true, enumerable: true,
        get: () => place,
        set(next) {
          place = next;
          record({ kind: 'place' });
        },
      });
    },
  });
}

// Called only after the fast driver and every Runner frame have finished.
export async function readBehaviorTrace() {
  const game = window.__game;
  const { known } = await import(new URL('../../js/lang.js', import.meta.url));
  return {
    ...window.__behaviorTrace,
    final: { flags: { ...game.flagsRef }, known: [...known], found: [...game.found],
      place: game.place.name, ended: game.ended, runner: game.runner.snapshot(),
      save: JSON.parse(localStorage.getItem('amakawa-day1-save')) },
  };
}
