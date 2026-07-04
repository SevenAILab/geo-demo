import { html, nothing, type TemplateResult } from "lit";
import type { GeoSkillAction } from "../geo-parsers.ts";
import type { GeoReport, GeoReportStatus } from "../geo-report.ts";
import { icons } from "../icons.ts";

export type GeoAssessmentProps = {
  siteUrl: string;
  starting: boolean;
  pendingSkill: GeoSkillAction | null;
  report: GeoReport | null;
  reportStatus: GeoReportStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onFixGaps: () => void;
  onDownload: () => void;
};

const METRIC_ICONS = [icons.eye, icons.layoutComfortable, icons.brain] as const;
const METRIC_LABELS = ["声音份额", "技术架构", "情绪指数"] as const;
const toneForValue = (v: number): "danger" | "warn" => (v < 55 ? "danger" : "warn");

const RUN_PROGRESS_STEPS = [
  {
    label: "创建检测任务",
    detail: "确认网址并初始化 GEO 体检任务",
  },
  {
    label: "抓取页面信号",
    detail: "读取站点内容、结构化信息和关键页面线索",
  },
  {
    label: "AI 可见性分析",
    detail: "评估品牌在 AI 搜索语境中的可见度与缺口",
  },
  {
    label: "生成分析报告",
    detail: "汇总得分、指标、风险项和优化建议",
  },
] as const;

const TREND_POINTS = [
  [0, 64],
  [18, 72],
  [36, 58],
  [55, 20],
  [74, 36],
  [100, 30],
] as const;

function trendPolyline(): string {
  return TREND_POINTS.map(([x, y]) => `${x},${y}`).join(" ");
}

function resolveRunProgressStep(props: GeoAssessmentProps, hasReport: boolean): number {
  if (hasReport) {
    return RUN_PROGRESS_STEPS.length;
  }
  if (props.starting) {
    return 1;
  }
  if (props.reportStatus === "loading") {
    return 4;
  }
  if (props.pendingSkill === "assessment" || props.skillBusy) {
    return 3;
  }
  return 2;
}

function renderRunProgress(props: GeoAssessmentProps, hasReport: boolean) {
  const active = props.starting || props.reportStatus === "loading" || props.skillBusy;
  if (!active || hasReport) {
    return nothing;
  }

  const stepNumber = resolveRunProgressStep(props, hasReport);
  const activeStep =
    RUN_PROGRESS_STEPS[Math.max(0, Math.min(stepNumber - 1, RUN_PROGRESS_STEPS.length - 1))];
  const progress = Math.max(16, Math.min(92, stepNumber * 23));

  return html`
    <section class="brandgeo-run-progress" aria-live="polite">
      <div class="brandgeo-run-progress__head">
        <div>
          <span class="brandgeo-run-progress__eyebrow">任务运行中</span>
          <h2>${activeStep.label}</h2>
          <p>${activeStep.detail}</p>
        </div>
        <strong>${progress}%</strong>
      </div>
      <div class="brandgeo-run-progress__bar" aria-hidden="true">
        <span style="width: ${progress}%"></span>
      </div>
      <ol class="brandgeo-run-progress__steps">
        ${RUN_PROGRESS_STEPS.map((step, index) => {
          const state =
            index + 1 < stepNumber ? "done" : index + 1 === stepNumber ? "active" : "pending";
          return html`
            <li class="brandgeo-run-progress__step brandgeo-run-progress__step--${state}">
              <span>${index + 1}</span>
              <div>
                <strong>${step.label}</strong>
                <small>${step.detail}</small>
              </div>
            </li>
          `;
        })}
      </ol>
    </section>
  `;
}

function renderScoreGauge(score: number, loading: boolean, gapCount: number, highCount: number) {
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.max(0, Math.min(score, 100)) / 100) * circumference;
  return html`
    <section class="brandgeo-score-card">
      <div class="brandgeo-gauge" aria-label="GEO 可见性得分 ${score}/100">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle class="brandgeo-gauge__track" cx="110" cy="110" r=${radius}></circle>
          <circle
            class="brandgeo-gauge__guide brandgeo-gauge__guide--one"
            cx="110"
            cy="110"
            r="68"
          ></circle>
          <circle
            class="brandgeo-gauge__guide brandgeo-gauge__guide--two"
            cx="110"
            cy="110"
            r="48"
          ></circle>
          <circle
            class="brandgeo-gauge__value"
            cx="110"
            cy="110"
            r=${radius}
            stroke-dasharray="${progress} ${circumference}"
          ></circle>
        </svg>
        <div class="brandgeo-gauge__score">
          <strong>${loading ? "..." : score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <div class="brandgeo-warning">
        ${icons.alertTriangle}
        <span
          >高危警告: 共 ${gapCount} 个优化项${highCount > 0 ? `（高危 ${highCount}）` : ""}</span
        >
      </div>
    </section>
  `;
}

function renderMetricCard(params: {
  icon: TemplateResult;
  label: string;
  value: number;
  note: string;
  tone: "danger" | "warn";
}) {
  return html`
    <article class="brandgeo-metric-card">
      <div class="brandgeo-metric-card__head">
        <span class="brandgeo-metric-card__label">${params.icon}${params.label}</span>
        <strong>${params.value}%</strong>
      </div>
      <div class="brandgeo-metric-card__bar" aria-hidden="true">
        <span
          class="brandgeo-metric-card__fill brandgeo-metric-card__fill--${params.tone}"
          style="width: ${params.value}%"
        ></span>
      </div>
      <p>${params.note}</p>
    </article>
  `;
}

function renderRankingList() {
  const rows = [
    ["S", "小型钻机", "拥有", "53.7% -"],
    ["B", "蒂尔塔", "", "32.4% -"],
    ["M", "曼富图", "", "21.5% -"],
    ["N", "内尔", "", "20.3% -"],
    ["P", "巅峰设计", "", "18.6% -"],
  ] as const;
  return html`
    <div class="brandgeo-ranking">
      <div class="brandgeo-ranking__title">
        <span>可见度得分排名</span>
        <span class="brandgeo-info">i</span>
      </div>
      <div class="brandgeo-ranking__mine">#暂无 - <strong>您的排名</strong></div>
      <div class="brandgeo-ranking__header">
        <span>资产</span>
        <span>可见性评分</span>
      </div>
      ${rows.map(
        ([badge, name, tag, score], index) => html`
          <div class="brandgeo-ranking__row">
            <span class="brandgeo-ranking__index">${index + 1}.</span>
            <span class="brandgeo-ranking__badge brandgeo-ranking__badge--${badge.toLowerCase()}">
              ${badge}
            </span>
            <span class="brandgeo-ranking__name">${name}</span>
            ${tag ? html`<span class="brandgeo-ranking__tag">${tag}</span>` : nothing}
            <span class="brandgeo-ranking__score">${score}</span>
          </div>
        `,
      )}
      <button type="button" class="brandgeo-ranking__custom">自定义竞品</button>
    </div>
  `;
}

function renderTrendPanel() {
  return html`
    <section class="brandgeo-trend-card">
      <div class="brandgeo-trend-card__top">
        <div>
          <h2>行业GEO可见性评分 <span class="brandgeo-info">i</span></h2>
          <p>为您抓取并分析同行业TOP数据</p>
        </div>
        <button type="button" class="brandgeo-chart-config">图表配置 ${icons.chevronDown}</button>
      </div>
      <div class="brandgeo-trend-card__body">
        <div class="brandgeo-chart">
          <div class="brandgeo-chart__summary">
            <span>历史搜索可见度排行 <span class="brandgeo-info">i</span></span>
            <strong>53.7% <em>-</em></strong>
          </div>
          <svg class="brandgeo-line-chart" viewBox="0 0 100 78" preserveAspectRatio="none">
            <line x1="0" x2="100" y1="12" y2="12"></line>
            <line x1="0" x2="100" y1="30" y2="30"></line>
            <line x1="0" x2="100" y1="48" y2="48"></line>
            <line x1="0" x2="100" y1="66" y2="66"></line>
            <polyline points=${trendPolyline()}></polyline>
          </svg>
          <div class="brandgeo-chart__axis">
            <span>9月21日</span>
            <span>9月22日</span>
            <span>9月23日</span>
            <span>9月24日</span>
            <span>9月25日</span>
            <span>9月26日</span>
          </div>
          <div class="brandgeo-chart__legend">
            <span><i></i>当前期间</span>
            <span class="brandgeo-chart__legend-muted"><i></i>比较竞争对手</span>
          </div>
        </div>
        ${renderRankingList()}
      </div>
    </section>
  `;
}

export function renderGeoAssessment(props: GeoAssessmentProps) {
  const loading = props.starting || props.reportStatus === "loading" || props.skillBusy;
  const report = props.report;
  const score = report?.totalScore ?? 42;
  const siteLabel = props.siteUrl.replace(/^https?:\/\//, "");
  const gaps = report?.gaps ?? [];
  const highCount = gaps.filter((g) => g.impact === "high").length;
  const hasReport = report != null;
  const errored = props.reportStatus === "error" && !hasReport;

  return html`
    <div class="brandgeo-app">
      <aside class="brandgeo-sidebar">
        <div class="brandgeo-logo">
          <span class="brandgeo-logo__mark"></span>
          <div>
            <strong>BRANDGEO</strong>
            <span>AI-Discoverable Branding</span>
          </div>
        </div>
        <nav class="brandgeo-nav" aria-label="BRANDGEO">
          <button type="button" class="brandgeo-nav__item brandgeo-nav__item--active">
            ${icons.layoutComfortable}<span>分析报告</span>
          </button>
          <button type="button" class="brandgeo-nav__item" @click=${props.onFixGaps}>
            ${icons.archive}<span>GEO内容工坊</span>
          </button>
          <button type="button" class="brandgeo-nav__item" disabled>
            ${icons.archive}<span>GEO检测面板</span>
          </button>
        </nav>
        <button type="button" class="brandgeo-help" @click=${props.onExitToConsole}>
          <span>?</span> 帮助中心
        </button>
      </aside>
      <main class="brandgeo-main">
        <header class="brandgeo-topbar">
          <span class="brandgeo-site">${siteLabel}</span>
          <div class="brandgeo-topbar__actions">
            <span>CN/EN</span>
            <span class="brandgeo-topbar__icon">${icons.radio}</span>
            <span class="brandgeo-avatar">${icons.circle}</span>
          </div>
        </header>
        <section class="brandgeo-report">
          <h1>GEO可见性分析报告</h1>
          ${renderRunProgress(props, hasReport)}
          <div class="brandgeo-hero-grid">
            ${renderScoreGauge(score, loading, gaps.length, highCount)}
            <section class="brandgeo-summary-card">
              <h2>核心优势分析</h2>
              ${hasReport
                ? html`<p>${report?.summary}</p>
                    ${highCount > 0
                      ? html`<ul class="brandgeo-summary-card__gaps">
                          ${gaps
                            .filter((g) => g.impact === "high")
                            .map((g) => html`<li>${g.title}</li>`)}
                        </ul>`
                      : nothing}`
                : errored
                  ? html`<p class="brandgeo-summary-card__error">
                      未能连接评分后端。请先启动 <code>geo-scoring-kit</code> 的评分服务：<code
                        >node scripts/geo-dev-server.mjs</code
                      >，然后重试。
                    </p>`
                  : html`<p>
                      输入站点并完成体检后，这里展示该品牌在 GEO/AEO 领域的核心优势与竞争定位分析。
                    </p>`}
              <div class="brandgeo-summary-card__actions">
                <button
                  type="button"
                  class="brandgeo-secondary"
                  ?disabled=${!hasReport}
                  @click=${props.onDownload}
                >
                  ${icons.download}<span>下载报告</span>
                </button>
                <button
                  type="button"
                  class="brandgeo-primary"
                  ?disabled=${loading}
                  @click=${props.onFixGaps}
                >
                  ${icons.zap}<span>Start Optimization Engine (开启优化引擎)</span>
                </button>
              </div>
            </section>
          </div>
          <div class="brandgeo-metric-grid">
            ${hasReport && report
              ? report.metrics.map((metric, index) =>
                  renderMetricCard({
                    icon: METRIC_ICONS[index] ?? icons.eye,
                    label: METRIC_LABELS[index] ?? metric.label,
                    value: metric.value,
                    note: metric.statusLabel,
                    tone: toneForValue(metric.value),
                  }),
                )
              : html`
                  ${renderMetricCard({
                    icon: icons.eye,
                    label: "声音份额",
                    value: 24,
                    note: "较上季度下降 5%",
                    tone: "danger",
                  })}
                  ${renderMetricCard({
                    icon: icons.layoutComfortable,
                    label: "技术架构",
                    value: 68,
                    note: "处于行业平均水平",
                    tone: "warn",
                  })}
                  ${renderMetricCard({
                    icon: icons.brain,
                    label: "情绪指数",
                    value: 35,
                    note: "受众情感连结较弱",
                    tone: "danger",
                  })}
                `}
          </div>
          ${renderTrendPanel()}
        </section>
      </main>
    </div>
  `;
}
