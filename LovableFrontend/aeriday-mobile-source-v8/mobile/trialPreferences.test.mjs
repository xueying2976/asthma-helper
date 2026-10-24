import { test, expect } from "bun:test";
import { trialLanguage } from "./trialPreferences.ts";

test("the native iPhone trial stays English with a Chinese device or snapshot preference", () => {
  expect(trialLanguage(true, "zh")).toBe("en");
});

test("browser presentation retains Chinese support", () => {
  expect(trialLanguage(false, "zh")).toBe("zh");
});