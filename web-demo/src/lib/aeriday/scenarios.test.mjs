import { describe, expect, test } from "bun:test";
import { getMetrics, withEntries, metricValue, todayMetrics } from "./scenarios.ts";

describe("presentation scenarios", () => {
  test("optional entries update only their dated manual metric", () => {
    const metrics = withEntries(getMetrics("changes"), [
      { id: "pef", value: 430, date: "2026-08-04T10:00" },
    ]);
    expect(metrics.find((m) => m.id === "pef")?.current).toBe(430);
    expect(metrics.find((m) => m.id === "pef")?.points[29]).toBe(430);
    expect(metrics.find((m) => m.id === "pef")?.source).toBe("manual");
    expect(metrics.find((m) => m.id === "rr")?.current).toBe(18.2);
  });
  test("last night respiratory rate is 18.2 vs 14–16", () => {
    const m = getMetrics("changes").find((m) => m.id === "rr");
    expect(m?.current).toBe(18.2);
    expect(m?.band).toEqual([14, 16]);
    expect(m?.status).toBe("different");
  });
  test("last night resting heart rate is 74 vs 60–68", () => {
    const m = getMetrics("changes").find((m) => m.id === "rhr");
    expect(m?.current).toBe(74);
    expect(m?.band).toEqual([60, 68]);
  });
  test("last night sleep is 5 h 40 m vs 7–8 h", () => {
    const m = getMetrics("changes").find((m) => m.id === "sleep");
    expect(m?.current).toBe(17 / 3);
    expect(m?.band).toEqual([7, 8]);
    if (m) expect(metricValue(m, "en")).toBe("5 h 40 m");
  });
  test("within-range scenario has no out-of-range comparisons", () => {
    const comparable = getMetrics("within").filter((m) => m.band);
    expect(comparable.length).toBeGreaterThan(0);
    for (const m of comparable) {
      expect(m.status).toBe("within");
      expect(m.current).not.toBeNull();
    }
  });
  test("insufficient or changed device data withholds baselines and includes gaps", () => {
    const device = getMetrics("gaps").filter((m) => m.source === "watch" || m.source === "phone");
    for (const m of device) {
      expect(m.band).toBeUndefined();
      expect(m.points).toContain(null);
      expect(["changed", "insufficient"]).toContain(m.status);
    }
    expect(device.find((m) => m.id === "sleep")?.status).toBe("changed");
  });
  test("manual records are never automatic and missing records are not zero", () => {
    const metrics = getMetrics("changes");
    for (const id of ["symptoms", "waking", "reliever", "controller", "pef"])
      expect(metrics.find((m) => m.id === id)?.source).toBe("manual");
    expect(metrics.find((m) => m.id === "symptoms")?.current).toBeNull();
  });
  test("7/30 daily data and Today share the same current samples", () => {
    for (const scenario of ["changes", "within", "gaps"]) {
      const metrics = getMetrics(scenario);
      for (const m of metrics) {
        expect(m.points.length).toBe(30);
        expect(m.points.slice(-7).length).toBe(7);
        expect(m.points[29]).toBe(m.current);
      }
      expect(todayMetrics(scenario).find((m) => m.id === "rr")?.value).toBe(
        metrics.find((m) => m.id === "rr")?.current === null
          ? null
          : String(metrics.find((m) => m.id === "rr")?.current),
      );
    }
  });
});
