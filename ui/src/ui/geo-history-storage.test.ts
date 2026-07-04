/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeoHistory, loadGeoHistory, saveGeoHistory } from "./geo-history-storage.ts";

const GATEWAY_A = "wss://a.example/openclaw";
const GATEWAY_B = "wss://b.example/openclaw";

// `getSafeLocalStorage` intentionally ignores jsdom's getter-based localStorage
// under VITEST, so provide an in-memory Storage as a plain data property.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  } as Storage;
}

let memoryStorage: Storage;

describe("geo-history-storage", () => {
  beforeEach(() => {
    memoryStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", memoryStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a snapshot with session keys", () => {
    saveGeoHistory(GATEWAY_A, {
      siteUrl: "https://merlord.com",
      phase: "brandStory",
      sessionKeys: { assessment: "sess-a", brandStory: "sess-b" },
    });

    const loaded = loadGeoHistory(GATEWAY_A);
    expect(loaded).toEqual({
      siteUrl: "https://merlord.com",
      phase: "brandStory",
      sessionKeys: { assessment: "sess-a", brandStory: "sess-b" },
    });
  });

  it("does not treat a snapshot without session keys as history", () => {
    saveGeoHistory(GATEWAY_A, {
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: {},
    });

    expect(loadGeoHistory(GATEWAY_A)).toBeNull();
  });

  it("isolates snapshots per gateway scope", () => {
    saveGeoHistory(GATEWAY_A, {
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: { assessment: "sess-a" },
    });

    expect(loadGeoHistory(GATEWAY_B)).toBeNull();
    expect(loadGeoHistory(GATEWAY_A)?.siteUrl).toBe("https://merlord.com");
  });

  it("clears a stored snapshot", () => {
    saveGeoHistory(GATEWAY_A, {
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: { assessment: "sess-a" },
    });
    clearGeoHistory(GATEWAY_A);

    expect(loadGeoHistory(GATEWAY_A)).toBeNull();
  });

  it("drops unknown session-key actions and falls back to assessment for a bad phase", () => {
    localStorage.setItem(
      "openclaw.control.geo-history.v1:wss://a.example/openclaw",
      JSON.stringify({
        siteUrl: "https://merlord.com",
        phase: "not-a-phase",
        sessionKeys: { assessment: "sess-a", bogus: "nope" },
      }),
    );

    const loaded = loadGeoHistory(GATEWAY_A);
    expect(loaded).toEqual({
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: { assessment: "sess-a" },
    });
  });
});
