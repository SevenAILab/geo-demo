// geo-live-score.ts — 联调：从真实评分后端（geo-scoring-kit/geo-dev-server）取 scorecard，
// 映射成 UI 的 GeoReport。dev-only：默认打 127.0.0.1:8799，可用 window.__GEO_SCORE_ENDPOINT__ 覆盖。
import { deriveBrandNameFromUrl } from "./geo-demo-data.ts";
import type {
  GeoReport,
  GeoReportGap,
  GeoReportImpact,
  GeoReportMetric,
  GeoReportRating,
} from "./geo-report.ts";

const DEFAULT_ENDPOINT = "http://127.0.0.1:8799";

// 后端 scorecard 的最小结构（只取用到的字段）
type Scorecard = {
  site_score: number;
  site_grade: string;
  technical_layer: { score: number };
  content_layer: {
    score: number;
    measured: {
      available: boolean;
      mention_rate: number;
      share_of_voice: number;
      measured_score: number;
    };
  };
  category_averages: {
    structured_data: number;
    authority_freshness: number;
    ai_citability: number;
  };
  strategic_gaps: string[];
};

export type LiveScoreOptions = {
  probe?: boolean; // 是否请求真实 probe（需后端有 key，无则自动降级）
  brand?: string;
  models?: string;
  runs?: number;
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number; // 超时保护，默认 20s；到点 abort，避免 UI 卡在 loading
};

function scoreEndpoint(override?: string): string {
  if (override) return override.replace(/\/$/, "");
  const fromWindow =
    typeof window !== "undefined"
      ? (window as unknown as { __GEO_SCORE_ENDPOINT__?: string }).__GEO_SCORE_ENDPOINT__
      : undefined;
  return (fromWindow || DEFAULT_ENDPOINT).replace(/\/$/, "");
}

function ratingForGrade(grade: string): GeoReportRating {
  if (grade === "A" || grade === "B") return "strong";
  if (grade === "C" || grade === "D") return "moderate";
  return "weak";
}

function schemaStatus(v: number): string {
  if (v >= 70) return "结构化数据覆盖良好";
  if (v >= 40) return "结构化数据部分缺失（Organization/FAQ 等）";
  return "缺少组织与 FAQ 等结构化标记";
}

function entityStatus(v: number): string {
  if (v >= 70) return "权威与新鲜度信号充分（作者/更新/来源）";
  if (v >= 40) return "品牌事实分散，实体信号偏弱";
  return "缺少作者/更新/来源等权威信号";
}

function impactForGap(text: string): GeoReportImpact {
  if (/红线|robots|地基|结构化/.test(text)) return "high";
  if (/权威|新鲜|深度/.test(text)) return "medium";
  return "low";
}

export function scorecardToGeoReport(sc: Scorecard, siteUrl: string): GeoReport {
  const brand = deriveBrandNameFromUrl(siteUrl);
  const cat = sc.category_averages;
  const m = sc.content_layer.measured;

  const aiValue = m.available ? m.measured_score : cat.ai_citability;
  const aiStatus = m.available
    ? `实测 MR ${Math.round(m.mention_rate)} / SoV ${Math.round(m.share_of_voice)}`
    : "on-page 可引用性（未接实测 probe）";

  const metrics: GeoReportMetric[] = [
    {
      id: "schema",
      label: "结构化数据",
      value: Math.round(cat.structured_data),
      statusLabel: schemaStatus(cat.structured_data),
    },
    {
      id: "entity",
      label: "实体权威",
      value: Math.round(cat.authority_freshness),
      statusLabel: entityStatus(cat.authority_freshness),
    },
    { id: "aiResponse", label: "AI 可见性", value: Math.round(aiValue), statusLabel: aiStatus },
  ];

  const gaps: GeoReportGap[] = sc.strategic_gaps.map((text, i) => ({
    id: `gap-${i}`,
    title: text,
    impact: impactForGap(text),
    description: text,
  }));

  const measuredNote = m.available
    ? `，实测 MR ${Math.round(m.mention_rate)}/SoV ${Math.round(m.share_of_voice)}`
    : "";
  const summary = `${brand} 站点 ${Math.round(sc.site_score)}/100（${sc.site_grade}）：技术层 ${Math.round(
    sc.technical_layer.score,
  )} ｜ 内容层 ${Math.round(sc.content_layer.score)}${measuredNote}。`;

  return {
    totalScore: Math.round(sc.site_score),
    rating: ratingForGrade(sc.site_grade),
    summary,
    metrics,
    gaps,
  };
}

/** 联调入口：拉真实 scorecard → GeoReport。失败向上抛，由调用方决定是否回退 demo。 */
export async function fetchLiveGeoReport(
  siteUrl: string,
  opts: LiveScoreOptions = {},
): Promise<GeoReport> {
  const base = scoreEndpoint(opts.endpoint);
  const params = new URLSearchParams({ url: siteUrl });
  if (opts.probe) {
    params.set("probe", "1");
    if (opts.brand) params.set("brand", opts.brand);
    if (opts.models) params.set("models", opts.models);
    if (opts.runs) params.set("runs", String(opts.runs));
  }
  // 超时保护：到点 abort，让上层 catch 走回退/错误态，而不是无限 loading。
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller?.abort(), { once: true });
  }
  try {
    const res = await fetch(`${base}/api/score?${params.toString()}`, {
      method: "GET",
      signal: controller?.signal ?? opts.signal,
    });
    if (!res.ok) {
      throw new Error(`score backend ${res.status}`);
    }
    const scorecard = (await res.json()) as Scorecard;
    return scorecardToGeoReport(scorecard, siteUrl);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
