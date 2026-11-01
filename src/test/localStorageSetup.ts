// Node 25 exposes a global `localStorage` stub whose storage path is unset, and that
// stub shadows happy-dom's Storage inside browser test environments. Replace it with
// an in-memory implementation when the runtime's global is not usable.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const store = new Map<string, string>();

  const memoryStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(String(key)) ?? null,
    setItem: (key: string, value: string) => {
      store.set(String(key), String(value));
    },
    removeItem: (key: string) => {
      store.delete(String(key));
    },
    clear: () => {
      store.clear();
    }
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: memoryStorage
  });
}
