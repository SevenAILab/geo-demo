// geo-report-export.ts — 「GEO 可见性分析报告」下载：GeoReport → Markdown 文件。
import type { GeoReport } from "./geo-report.ts";

const RATING_LABEL: Record<string, string> = { strong: "强", moderate: "中", weak: "弱" };
const IMPACT_LABEL: Record<string, string> = { high: "高危", medium: "中", low: "低" };

/** 组装可读的 Markdown 报告（评分 + 核心优势 + 中部指标 + 高危警告）。now 可注入便于测试。 */
export function buildGeoReportMarkdown(
  report: GeoReport,
  siteUrl: string,
  now = Date.now(),
): string {
  const highCount = report.gaps.filter((g) => g.impact === "high").length;
  const lines: string[] = [
    "# GEO 可见性分析报告",
    "",
    `- 站点：${siteUrl}`,
    `- 生成时间：${new Date(now).toISOString()}`,
    `- 总评分：${report.totalScore}/100（可见性：${RATING_LABEL[report.rating] ?? report.rating}）`,
    "",
    "## 核心优势分析",
    report.summary || "（无）",
    "",
    "## 中部相关指标",
    ...report.metrics.map((m) => `- ${m.label}：${m.value}% — ${m.statusLabel}`),
    "",
    `## 高危警告（共 ${report.gaps.length} 项，其中高危 ${highCount} 项）`,
    ...(report.gaps.length
      ? report.gaps.map(
          (g) =>
            `- [${IMPACT_LABEL[g.impact] ?? g.impact}] ${g.title}` +
            (g.description && g.description !== g.title ? ` — ${g.description}` : ""),
        )
      : ["（无）"]),
    "",
  ];
  return lines.join("\n");
}

function safeHost(siteUrl: string): string {
  return siteUrl.replace(/^https?:\/\//, "").replace(/[^\w.-]/g, "_") || "site";
}

/** 触发浏览器下载 Markdown 报告。report 为空则不动作。 */
export function downloadGeoReport(report: GeoReport | null, siteUrl: string): void {
  if (!report) {
    return;
  }
  const markdown = buildGeoReportMarkdown(report, siteUrl);
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `geo-report-${safeHost(siteUrl)}-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}
