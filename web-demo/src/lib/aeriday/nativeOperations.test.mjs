import { test, expect } from "bun:test";
import { saveMedicineThenReminder, writeAndRefresh } from "./nativeOperations.ts";
import { setNativeMetrics, getMetrics, metricValue } from "./scenarios.ts";

test("a reminder failure preserves medicine commit and refreshes native state", async () => {
  let saved = false;
  let refreshed = false;
  const operation = () => saveMedicineThenReminder(async () => { saved = true; return { id: "medicine-1" }; }, async (id) => { expect(id).toBe("medicine-1"); throw new Error("notification denied"); });
  await expect(writeAndRefresh(operation, async () => { refreshed = true; })).rejects.toMatchObject({ code: "medicine_saved_reminder_failed" });
  expect(saved).toBe(true);
  expect(refreshed).toBe(true);
});

test("failed read-back after a partial save is not reported as refreshed", async () => {
  await expect(writeAndRefresh(() => saveMedicineThenReminder(async () => ({ id: "m" }), async () => { throw new Error(); }), async () => { throw new Error(); })).rejects.toMatchObject({ code: "partial_refresh_failed" });
});

test("native latest samples retain provenance and supplied units without demo baselines", () => {
  try {
    setNativeMetrics([{ id: "sleep", current: 35, source: "HealthKit · Watch", sampledAt: "2026-10-16T07:10:00Z", unit: "min", semantics: "latestSample", status: "different", points: [35], freshness: "07:10" }, { id: "steps", current: 16, source: "iPhone", unit: "steps", semantics: "latestSample", status: "within", points: [], freshness: "08:00" }], "2026-10-16");
    const sleep = getMetrics("changes").find((m) => m.id === "sleep");
    expect(sleep?.sourceLabel).toBe("HealthKit · Watch");
    expect(sleep?.sampledAt).toBe("2026-10-16T07:10:00Z");
    expect(sleep?.semantics).toBe("latestSample");
    expect(sleep?.band).toBeUndefined();
    expect(sleep?.status).toBe("within");
    if (sleep) expect(metricValue(sleep, "en")).toBe("35 min");
    expect(getMetrics("within").find((m) => m.id === "steps")?.current).toBe(16);
    expect(getMetrics("within").find((m) => m.id === "rr")?.current).toBeNull();
  } finally { setNativeMetrics(null); }
});