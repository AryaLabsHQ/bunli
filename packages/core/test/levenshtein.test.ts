import { expect, test } from "bun:test";

import { findSuggestion } from "../src/utils/index.js";

test("findSuggestion returns undefined for empty input", () => {
  expect(findSuggestion("", ["deploy", "help"])).toBeUndefined();
});

test("findSuggestion still prefers close prefix matches for non-empty input", () => {
  expect(findSuggestion("dep", ["deploy", "help"])).toBe("deploy");
});
