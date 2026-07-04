// geo-live-score.ts — 联调：从真实评分后端（geo-scoring-kit/geo-dev-server）取 scorecard，
// 映射成 UI 的 GeoReport。dev-only：默认打 127.0.0.1:8799，可用 window.__GEO_SCORE_ENDPOINT__ 覆盖。
import { deriveBrandNameFromUrl } from "./geo-demo-data.ts";
import { type GeoOutputCenter, parseGeoOutputCenterJson } from "./geo-parsers.ts";
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
  // 行业可见性排名（A 口径，仅在跑过 probe 且知道本品牌名时有值）：本品牌 + 各竞品同口径分。
  industry?: Array<{ name: string; score: number; owned?: boolean }>;
};

export type LiveScoreOptions = {
  probe?: boolean; // 是否请求真实 probe（需后端有 key，无则自动降级）
  brand?: string;
  models?: string;
  runs?: number;
  competitors?: string[]; // 未跑 probe 时，行业排名回退用真实竞品名（brandStory）而非占位标杆
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

function impactForGap(text: string): GeoReportImpact {
  if (/红线|robots|地基|结构化/.test(text)) return "high";
  if (/权威|新鲜|深度/.test(text)) return "medium";
  return "low";
}

function technicalStatus(v: number): string {
  if (v >= 75) return "技术架构稳固（抓取 / 索引 / 结构化）";
  if (v >= 50) return "技术地基尚可，仍有优化空间";
  return "技术架构薄弱，AI 难以抓取与索引";
}

function brandStatus(v: number, measured: boolean): string {
  if (measured) return v >= 60 ? "品牌内容声量领先" : "同类提问中品牌声量偏弱";
  if (v >= 75) return "品牌内容深度与可引用性强";
  if (v >= 50) return "品牌内容力中等，可引用结构待补";
  return "品牌内容力弱（深度 / 直答 / 权威不足）";
}

function aiVisibilityStatus(v: number, measured: boolean): string {
  if (measured) return v >= 60 ? "AI 实测可见度高" : "AI 实测可见度不足，易被竞品压制";
  if (v >= 60) return "on-page 可引用性较好（未接实测 probe）";
  return "on-page 可引用性偏弱（未接实测 probe）";
}

const initialOf = (name: string): string => (name.trim().charAt(0) || "品").toUpperCase();
const clampInt = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

// 行业排名三档回退：① 真实 probe 行业可见性 → ② 真实竞品名(brandStory)+估算分 → ③ 占位标杆。
function resolveRankings(
  sc: Scorecard,
  brand: string,
  currentVisibility: number,
  totalScore: number,
  competitors: string[],
): GeoReport["industryAnalysis"]["rankings"] {
  if (sc.industry && sc.industry.length > 0) {
    // 本品牌与竞品同口径（posDecay×stance），owned 用其行业分而非「情绪指数」以保排名自洽。
    return sc.industry.map((row, i) => ({
      id: row.owned ? "owned" : `c${i + 1}`,
      initial: initialOf(row.owned ? brand : row.name),
      name: row.owned ? brand : row.name,
      score: clampInt(row.score),
      owned: row.owned ? true : undefined,
    }));
  }
  const owned = {
    id: "owned",
    initial: initialOf(brand),
    name: brand,
    score: currentVisibility,
    owned: true as const,
  };
  const names = competitors
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (names.length > 0) {
    const offsets = [12, 6, -4, -11];
    return [
      owned,
      ...names.map((name, i) => ({
        id: `c${i + 1}`,
        initial: initialOf(name),
        name,
        score: clampInt(totalScore + (offsets[i] ?? -4)),
      })),
    ];
  }
  return [
    owned,
    { id: "c1", initial: "A", name: "行业标杆 A", score: Math.min(100, totalScore + 12) },
    { id: "c2", initial: "B", name: "行业标杆 B", score: Math.min(100, totalScore + 6) },
    { id: "c3", initial: "C", name: "行业标杆 C", score: Math.max(0, totalScore - 4) },
    { id: "c4", initial: "D", name: "行业标杆 D", score: Math.max(0, totalScore - 11) },
  ];
}

export function scorecardToGeoReport(
  sc: Scorecard,
  siteUrl: string,
  competitors: string[] = [],
): GeoReport {
  const brand = deriveBrandNameFromUrl(siteUrl);
  const cat = sc.category_averages;
  const m = sc.content_layer.measured;

  // 中部三指标直接对应评分模型的两层 + 实测：
  //   技术架构 = 技术层分；声音份额 = 内容层(品牌)分；情绪指数 = 实测分(有 probe)/on-page 可引用性
  const technicalValue = Math.round(sc.technical_layer.score);
  const brandValue = Math.round(sc.content_layer.score);
  const aiValue = Math.round(m.available ? m.measured_score : cat.ai_citability);

  const metrics: GeoReportMetric[] = [
    {
      id: "schema", // 展示为「技术架构」
      label: "技术架构",
      value: technicalValue,
      statusLabel: technicalStatus(technicalValue),
    },
    {
      id: "entity", // 展示为「声音份额」
      label: "声音份额",
      value: brandValue,
      statusLabel: brandStatus(brandValue, m.available),
    },
    {
      id: "aiResponse", // 展示为「情绪指数」
      label: "情绪指数",
      value: aiValue,
      statusLabel: m.available
        ? `实测 MR ${Math.round(m.mention_rate)} / SoV ${Math.round(m.share_of_voice)}`
        : aiVisibilityStatus(aiValue, false),
    },
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
  const summary = `${brand} 站点 ${Math.round(sc.site_score)}/100（${sc.site_grade}）：技术分 ${technicalValue} ｜ 品牌分 ${brandValue}${measuredNote}。`;
  const totalScore = Math.round(sc.site_score);
  const currentVisibility = aiValue;

  const rankings = resolveRankings(sc, brand, currentVisibility, totalScore, competitors);
  const ownedRank = [...rankings].sort((a, b) => b.score - a.score).findIndex((r) => r.owned) + 1;
  const yourRanking = ownedRank > 0 ? `#${ownedRank} - 您的排名` : "#暂无 - 您的排名";

  return {
    totalScore,
    rating: ratingForGrade(sc.site_grade),
    summary,
    metrics,
    gaps,
    industryAnalysis: {
      currentVisibility,
      yourRanking,
      trend: [
        { date: "9/21", value: Math.max(0, currentVisibility - 8) },
        { date: "9/22", value: Math.max(0, currentVisibility - 5) },
        { date: "9/23", value: Math.max(0, currentVisibility - 3) },
        { date: "9/24", value: Math.min(100, currentVisibility + 2) },
        { date: "9/25", value: Math.max(0, currentVisibility - 1) },
        { date: "9/26", value: currentVisibility },
      ],
      rankings,
    },
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
    return scorecardToGeoReport(scorecard, siteUrl, opts.competitors ?? []);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type LiveContentOptions = {
  brand?: string;
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number; // /api/content 会现场重跑评分（站点检查+爬页面），默认放宽到 30s
};

/**
 * 联调入口：命中评分后端 /api/content，取回 scorecard 派生的「四大修复大类」卡片。
 * 与 fetchLiveGeoReport 同构：失败向上抛，由调用方决定是否回退 demo。
 */
export async function fetchLiveGeoContent(
  siteUrl: string,
  opts: LiveContentOptions = {},
): Promise<GeoOutputCenter> {
  const base = scoreEndpoint(opts.endpoint);
  const params = new URLSearchParams({ url: siteUrl });
  if (opts.brand) {
    params.set("brand", opts.brand);
  }
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller?.abort(), { once: true });
  }
  try {
    const res = await fetch(`${base}/api/content?${params.toString()}`, {
      method: "GET",
      signal: controller?.signal ?? opts.signal,
    });
    if (!res.ok) {
      throw new Error(`content backend ${res.status}`);
    }
    const output = parseGeoOutputCenterJson(await res.json());
    if (!output) {
      throw new Error("content backend returned invalid categories");
    }
    return output;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
