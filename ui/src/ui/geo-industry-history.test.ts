import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorageMock } from "../test-helpers/storage.ts";
import { recordGeoIndustryVisibility } from "./geo-industry-history.ts";
import type { GeoReport } from "./geo-report.ts";

function report(value: number): GeoReport {
  return {
    totalScore: value,
    rating: "moderate",
    summary: "report",
    metrics: [],
    gaps: [],
    industryAnalysis: {
      currentVisibility: value,
      yourRanking: "#暂无 - 您的排名",
      trend: [{ date: "synthetic", value: 1 }],
      rankings: [],
    },
  };
}

function localTs(hour: number): number {
  return new Date(2026, 8, 1, hour, 0).getTime();
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorageMock());
});

describe("recordGeoIndustryVisibility", () => {
  it("stores same-site visibility history in browser storage", () => {
    const first = recordGeoIndustryVisibility("https://www.acme.com", report(41), localTs(8));
    const second = recordGeoIndustryVisibility("https://acme.com/pricing", report(46), localTs(9));

    expect(first.industryAnalysis.trend).toEqual([{ date: "9/1 08:00", value: 41 }]);
    expect(second.industryAnalysis.trend).toEqual([
      { date: "9/1 08:00", value: 41 },
      { date: "9/1 09:00", value: 46 },
    ]);
  });

  it("keeps different websites in separate histories", () => {
    recordGeoIndustryVisibility("https://acme.com", report(41), localTs(8));
    const beta = recordGeoIndustryVisibility("https://beta.com", report(72), localTs(9));
    const acme = recordGeoIndustryVisibility("https://acme.com/about", report(43), localTs(10));

    expect(beta.industryAnalysis.trend).toEqual([{ date: "9/1 09:00", value: 72 }]);
    expect(acme.industryAnalysis.trend).toEqual([
      { date: "9/1 08:00", value: 41 },
      { date: "9/1 10:00", value: 43 },
    ]);
  });
});
