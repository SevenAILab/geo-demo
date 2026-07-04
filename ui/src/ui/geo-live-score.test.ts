import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveGeoReport, scorecardToGeoReport } from "./geo-live-score.ts";

const baseScorecard = {
  site_score: 71.11,
  site_grade: "C",
  technical_layer: { score: 86.91 },
  content_layer: {
    score: 62.6,
    measured: { available: false, mention_rate: 0, share_of_voice: 0, measured_score: 0 },
  },
  category_averages: { structured_data: 61.67, authority_freshness: 66.67, ai_citability: 60.63 },
  strategic_gaps: [
    "robots 正在挡实时 AI 引用路径，削弱可发现性",
    "重点页仍需更多深度、标题、表格或列表",
  ],
};

describe("scorecardToGeoReport", () => {
  it("maps on-page scorecard (no measured) to a GeoReport", () => {
    const r = scorecardToGeoReport(baseScorecard, "https://acme.com");
    expect(r.totalScore).toBe(71);
    expect(r.rating).toBe("moderate"); // grade C
    expect(r.metrics.map((m) => m.id)).toEqual(["schema", "entity", "aiResponse"]);
    // 无实测 → aiResponse 用 on-page ai_citability
    expect(r.metrics[2].value).toBe(61);
    expect(r.metrics[2].statusLabel).toContain("未接实测");
    // 红线缺口 → high 优先
    expect(r.gaps[0].impact).toBe("high");
    expect(r.summary).toContain("Acme");
  });

  it("uses measured MR/SoV for aiResponse when probe ran", () => {
    const withMeasured = {
      ...baseScorecard,
      site_grade: "B",
      content_layer: {
        score: 68.68,
        measured: {
          available: true,
          mention_rate: 100,
          share_of_voice: 71.43,
          measured_score: 82.86,
        },
      },
    };
    const r = scorecardToGeoReport(withMeasured, "https://acme.com");
    expect(r.rating).toBe("strong"); // grade B
    expect(r.metrics[2].value).toBe(83); // round(82.86)
    expect(r.metrics[2].statusLabel).toContain("MR 100");
    expect(r.metrics[2].statusLabel).toContain("SoV 71");
  });
});

describe("fetchLiveGeoReport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the score backend and maps the response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => baseScorecard,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchLiveGeoReport("https://acme.com", { endpoint: "http://127.0.0.1:8801" });
    expect(r.totalScore).toBe(71);
    const calledUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("http://127.0.0.1:8801/api/score?url=https");
  });

  it("passes probe params when requested", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => baseScorecard,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    await fetchLiveGeoReport("https://acme.com", {
      probe: true,
      brand: "Acme",
      models: "deepseek",
      runs: 2,
    });
    const calledUrl = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("probe=1");
    expect(calledUrl).toContain("brand=Acme");
    expect(calledUrl).toContain("models=deepseek");
  });

  it("throws on non-ok response so caller can fall back to demo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch,
    );
    await expect(fetchLiveGeoReport("https://acme.com")).rejects.toThrow("500");
  });
});
