import test from "node:test";
import assert from "node:assert/strict";
import { memoryStorage, isolateStorage } from "./memory-storage.mjs";

test("demo storage shadows real storage without ever reading its getters", () => {
  const host = Object.create(
    Object.defineProperties(
      {},
      {
        localStorage: {
          get() {
            assert.fail("real local storage was read");
          },
        },
        sessionStorage: {
          get() {
            assert.fail("real session storage was read");
          },
        },
        indexedDB: {
          get() {
            assert.fail("real save thumbnails were accessed");
          },
        },
      },
    ),
  );
  isolateStorage(host);
  assert.equal(
    JSON.parse(host.localStorage.getItem("amakawa-settings")).privateMode,
    false,
  );
  host.localStorage.setItem("amakawa-save", "demo only");
  assert.equal(host.sessionStorage.getItem("amakawa-save"), null);
  assert.equal(host.indexedDB, undefined);
  assert.equal(
    Object.getOwnPropertyDescriptor(host, "localStorage").configurable,
    false,
  );
});

test("memory storage supports save removal and clearing without leaking between frames", () => {
  const first = memoryStorage(),
    next = memoryStorage();
  first.setItem(42, 7);
  assert.equal(first.key(0), "42");
  assert.equal(first.getItem("42"), "7");
  assert.equal(next.getItem("42"), null);
  first.removeItem(42);
  assert.equal(first.length, 0);
  first.setItem("a", "b");
  first.clear();
  assert.equal(first.key(0), null);
});
