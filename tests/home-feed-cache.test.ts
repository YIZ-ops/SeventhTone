import test from "node:test";
import assert from "node:assert/strict";
import type { HomeFeedSection } from "../src/types";
import { clearHomeFeedCache, getHomeFeedCache, setHomeFeedCache } from "../src/store/homeFeedCache";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const sampleSections: HomeFeedSection[] = [
  {
    title: "NEWS",
    layout: "list",
    cardMode: "24",
    items: [
      {
        contId: 1,
        nodeId: 2,
        name: "Cached headline",
        summary: "Cached summary",
        pubTime: "now",
        pubTimeLong: 1,
        pic: "https://image.test/a.jpg",
        appHeadPic: "https://image.test/b.jpg",
        link: "",
      },
    ],
  },
];

const localStorageMock = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

test.beforeEach(() => {
  localStorageMock.clear();
  clearHomeFeedCache();
});

test("home feed cache returns stored sections before TTL expires", () => {
  setHomeFeedCache(sampleSections);

  assert.deepEqual(getHomeFeedCache(), sampleSections);
});

test("home feed cache expires after three hours", () => {
  const originalNow = Date.now;
  try {
    Date.now = () => 1_000;
    setHomeFeedCache(sampleSections);

    Date.now = () => 1_000 + 3 * 60 * 60 * 1000 + 1;
    assert.equal(getHomeFeedCache(), null);
  } finally {
    Date.now = originalNow;
  }
});
