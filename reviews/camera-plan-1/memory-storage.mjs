// Installed before importing any game module. Neither storage object reads its real counterpart.
export function memoryStorage(seed = {}) {
  const values = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)]),
  );
  return {
    get length() {
      return values.size;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    getItem(key) {
      return values.get(String(key)) ?? null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    },
  };
}

export function isolateStorage(target) {
  Object.defineProperty(target, "localStorage", {
    value: memoryStorage({
      "amakawa-settings": JSON.stringify({
        v: 2,
        privateMode: false,
        master: 0,
        voiceInput: "off",
        quality: "low",
      }),
    }),
    configurable: false,
  });
  Object.defineProperty(target, "sessionStorage", {
    value: memoryStorage(),
    configurable: false,
  });
  // Save thumbnails use IndexedDB. The demo needs none, including if a future game import adds the save shell.
  Object.defineProperty(target, "indexedDB", {
    value: undefined,
    configurable: false,
  });
}
