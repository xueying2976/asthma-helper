import type { Lang } from "../src/lib/aeriday/copy";

/** Presentation policy only: never writes Swift's ordinary or UI-test preferences. */
export function trialLanguage(native: boolean, preferred: Lang): Lang {
  return native ? "en" : preferred;
}