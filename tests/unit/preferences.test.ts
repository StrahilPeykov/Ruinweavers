import { it, expect, vi, afterEach } from "vitest";
import {
  DEFAULT_BINDINGS,
  parseControlPreferences,
} from "../../src/input/input";
import { readPreference, writePreference } from "../../src/preferences";
afterEach(() => vi.unstubAllGlobals());
it("restores complete valid controls, rejecting corrupt, incomplete or conflicting bindings atomically", () => {
  const prefs = {
    profile: "custom",
    wheelEnabled: true,
    bindings: structuredClone(DEFAULT_BINDINGS),
  };
  prefs.bindings.secondary = ["Mouse2", "KeyR", "KeyK"];
  expect(parseControlPreferences(prefs)).toEqual(prefs);
  for (const bad of [
    null,
    {},
    { ...prefs, profile: "invalid" },
    { ...prefs, profile: { toString: null, valueOf: null } },
    { ...prefs, wheelEnabled: "true" },
    { ...prefs, bindings: { ...prefs.bindings, up: [] } },
    { ...prefs, bindings: { ...prefs.bindings, next: ["KeyR"] } },
    { ...prefs, bindings: { ...prefs.bindings, next: ["ControlLeft"] } },
  ])
    expect(parseControlPreferences(bad)).toBeNull();
});
it("denied or corrupt browser storage never prevents playing", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => "broken-json",
    setItem: () => {
      throw Error("quota");
    },
  });
  expect(readPreference("test")).toBeNull();
  expect(() => writePreference("test", true)).not.toThrow();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("denied");
    },
  });
  expect(readPreference("test")).toBeNull();
});
