import { describe, expect, it } from "vitest";
import { buildGeoReportMarkdown } from "./geo-report-export.ts";
import type { GeoReport } from "./geo-report.ts";

const report: GeoReport = {
  totalScore: 71,
  rating: "moderate",
  summary: "Acme 站点 71/100（C）：技术层 87 ｜ 内容层 63。",
  metrics: [
    { id: "schema", label: "结构化数据", value: 62, statusLabel: "结构化数据部分缺失" },
    { id: "entity", label: "实体权威", value: 67, statusLabel: "权威信号充分" },
    {
      id: "aiResponse",
      label: "AI 可见性",
      value: 61,
      statusLabel: "on-page 可引用性（未接实测 probe）",
    },
  ],
  gaps: [
    {
      id: "gap-0",
      title: "robots 正在挡实时 AI 引用路径",
      impact: "high",
      description: "robots 正在挡实时 AI 引用路径",
    },
    {
      id: "gap-1",
      title: "重点页仍需更多深度",
      impact: "medium",
      description: "重点页仍需更多深度",
    },
  ],
};

describe("buildGeoReportMarkdown", () => {
  const md = buildGeoReportMarkdown(report, "https://acme.com", 0);

  it("includes score, advantage, metrics and warnings sections", () => {
    expect(md).toContain("# GEO 可见性分析报告");
    expect(md).toContain("总评分：71/100");
    expect(md).toContain("## 核心优势分析");
    expect(md).toContain("Acme 站点 71/100");
    expect(md).toContain("## 中部相关指标");
    expect(md).toContain("- 结构化数据：62% — 结构化数据部分缺失");
    expect(md).toContain("## 高危警告（共 2 项，其中高危 1 项）");
    expect(md).toContain("[高危] robots 正在挡实时 AI 引用路径");
  });

  it("handles a report with no gaps", () => {
    const clean = buildGeoReportMarkdown({ ...report, gaps: [] }, "https://acme.com", 0);
    expect(clean).toContain("## 高危警告（共 0 项，其中高危 0 项）");
    expect(clean).toContain("（无）");
  });
});
