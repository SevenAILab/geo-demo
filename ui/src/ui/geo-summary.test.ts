import { describe, expect, it, vi } from "vitest";
import type { GeoReport } from "./geo-report.ts";
import {
  buildGeoCoreSummaryPrompt,
  GEO_CORE_SUMMARY_MAX_CHARS,
  normalizeGeoCoreSummary,
  requestGeoCoreSummary,
} from "./geo-summary.ts";

const report: GeoReport = {
  totalScore: 42,
  rating: "weak",
  summary: "Merlord 可被检索到，但 AI 回答仍缺乏结构化实体证据。",
  metrics: [
    { id: "schema", label: "技术架构", value: 38, statusLabel: "缺少 Organization 标记" },
    { id: "entity", label: "声音份额", value: 45, statusLabel: "品牌事实分散" },
    { id: "aiResponse", label: "情绪指数", value: 41, statusLabel: "引用置信度偏低" },
  ],
  gaps: [
    {
      id: "schema",
      title: "补充 Organization 与 FAQ 结构化数据",
      impact: "high",
      description: "补充 Organization 与 FAQ 结构化数据",
    },
  ],
  industryAnalysis: {
    currentVisibility: 42,
    yourRanking: "#暂无 - 您的排名",
    trend: [{ date: "9/21", value: 42 }],
    rankings: [{ id: "owned", initial: "M", name: "Merlord", score: 42, owned: true }],
  },
};

describe("normalizeGeoCoreSummary", () => {
  it("removes wrappers and caps the summary to 50 characters", () => {
    const result = normalizeGeoCoreSummary(
      "核心总结：这是一个非常长的总结内容，需要被限制在五十个字以内以适配报告卡片展示区域并保持紧凑。",
    );

    expect(Array.from(result).length).toBeLessThanOrEqual(GEO_CORE_SUMMARY_MAX_CHARS);
    expect(result).not.toContain("核心总结");
  });

  it("uses JSON summary output when OpenClaw returns structured text", () => {
    expect(
      normalizeGeoCoreSummary('{"summary":"品牌可见度偏弱，需补齐结构化证据与引用内容。"}'),
    ).toBe("品牌可见度偏弱，需补齐结构化证据与引用内容。");
  });
});

describe("buildGeoCoreSummaryPrompt", () => {
  it("asks OpenClaw for a short Chinese summary from the report", () => {
    const prompt = buildGeoCoreSummaryPrompt(report, "https://merlord.com");

    expect(prompt).toContain("50字以内");
    expect(prompt).toContain("https://merlord.com");
    expect(prompt).toContain("技术架构38%");
    expect(prompt).toContain("补充 Organization 与 FAQ 结构化数据");
  });
});

describe("requestGeoCoreSummary", () => {
  it("waits for an OpenClaw run and reads the assistant summary from history", async () => {
    const request = vi.fn(async (method: string) => {
      if (method === "agent") {
        return { runId: "geo-run-1", sessionKey: "agent:main:geo-summary" };
      }
      if (method === "agent.wait") {
        return { status: "ok" };
      }
      if (method === "chat.history") {
        return {
          messages: [
            { role: "user", content: "prompt" },
            { role: "assistant", content: "核心总结：可见度偏弱，需补齐结构化证据与引用内容。" },
          ],
        };
      }
      throw new Error(`unexpected method ${method}`);
    });

    const summary = await requestGeoCoreSummary({
      client: { request },
      currentSessionKey: "agent:main:main",
      siteUrl: "https://merlord.com",
      report,
    });

    expect(summary).toBe("可见度偏弱，需补齐结构化证据与引用内容。");
    expect(request.mock.calls.map(([method]) => method)).toEqual([
      "agent",
      "agent.wait",
      "chat.history",
    ]);
    expect(request.mock.calls[0][1]).toMatchObject({
      deliver: false,
      sessionKey: "agent:main:geo-summary",
      label: "GEO 核心总结",
    });
  });
});
