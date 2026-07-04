import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import type { GeoSkillAction } from "../geo-parsers.ts";
import type {
  GeoReport,
  GeoReportGap,
  GeoReportMetric,
  GeoReportMetricId,
  GeoReportStatus,
} from "../geo-report.ts";
import { icons } from "../icons.ts";
import { renderVisibilityTrendChart } from "./geo-assessment-chart.ts";
import "./geo-assessment-ranking.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

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
};

const GAP_ICONS = [icons.search, icons.fileText, icons.link] as const;

const METRIC_ICONS: Record<GeoReportMetricId, TemplateResult> = {
  schema: icons.link,
  entity: icons.eye,
  aiResponse: icons.activity,
};

const METRIC_DISPLAY_LABELS: Record<GeoReportMetricId, string> = {
  schema: "技术架构",
  entity: "声音份额",
  aiResponse: "情绪指数",
};

const METRIC_DISPLAY_ORDER: readonly GeoReportMetricId[] = ["entity", "schema", "aiResponse"];

function metricBarToneClass(value: number): string {
  if (value <= 40) {
    return "geo-assessment-v2__metric-fill--low";
  }
  if (value <= 70) {
    return "geo-assessment-v2__metric-fill--mid";
  }
  return "geo-assessment-v2__metric-fill--high";
}

function metricDisplayLabel(id: GeoReportMetricId): string {
  return METRIC_DISPLAY_LABELS[id];
}

function renderScoreDecorRings() {
  return html`
    <div class="geo-assessment-v2__score-decor" aria-hidden="true">
      <span class="geo-assessment-v2__score-decor-ring"></span>
      <span class="geo-assessment-v2__score-decor-ring geo-assessment-v2__score-decor-ring--mid"></span>
      <span class="geo-assessment-v2__score-decor-ring geo-assessment-v2__score-decor-ring--inner"></span>
    </div>
  `;
}

function renderScoreRing(score: number) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  return html`
    <svg class="geo-score-ring geo-assessment-v2__score-ring" viewBox="0 0 140 140" aria-hidden="true">
      <circle class="geo-score-ring__track" cx="70" cy="70" r=${radius} />
      <circle
        class="geo-score-ring__value"
        cx="70"
        cy="70"
        r=${radius}
        stroke-dasharray="${progress} ${circumference}"
      />
    </svg>
  `;
}

function renderScoreCard(report: GeoReport) {
  return html`
    <section class="geo-assessment-v2__card geo-assessment-v2__score-card">
      <div class="geo-assessment-v2__score-ring-wrap">
        ${renderScoreDecorRings()}
        ${renderScoreRing(report.totalScore)}
        <div class="geo-assessment-v2__score-value">
          <strong>${report.totalScore}</strong>
          <span>/100</span>
        </div>
      </div>
      <div class="geo-assessment-v2__warning" role="status">
        <span class="geo-assessment-v2__warning-icon" aria-hidden="true"
          >${icons.alertTriangle}</span
        >
        ${t("geo.assessment.highRiskWarning", { count: String(report.gaps.length) })}
      </div>
    </section>
  `;
}

function renderAdvantagesCard(report: GeoReport, canFix: boolean, onFixGaps: () => void) {
  return html`
    <section class="geo-assessment-v2__card geo-assessment-v2__advantages">
      <div class="geo-assessment-v2__advantages-body">
        <h2 class="geo-assessment-v2__card-title">${t("geo.assessment.coreAdvantagesTitle")}</h2>
        <p class="geo-assessment-v2__advantages-text">${report.summary}</p>
      </div>
      <div class="geo-assessment-v2__advantages-footer">
        <button
          type="button"
          class="geo-assessment-v2__btn geo-assessment-v2__btn--cta"
          ?disabled=${!canFix}
          @click=${onFixGaps}
        >
          ${icons.rocket} ${t("geo.assessment.startOptimization")}
        </button>
      </div>
    </section>
  `;
}

function renderMetricCard(metric: GeoReportMetric) {
  const fillClass = metricBarToneClass(metric.value);
  const icon = METRIC_ICONS[metric.id] ?? icons.activity;
  return html`
    <article class="geo-assessment-v2__card geo-assessment-v2__metric-card">
      <div class="geo-assessment-v2__metric-head">
        <span class="geo-assessment-v2__metric-icon" aria-hidden="true">${icon}</span>
        <span class="geo-assessment-v2__metric-label">${metricDisplayLabel(metric.id)}</span>
        <strong class="geo-assessment-v2__metric-value">${metric.value}%</strong>
      </div>
      <div class="geo-assessment-v2__metric-bar" aria-hidden="true">
        <span
          class="geo-assessment-v2__metric-fill ${fillClass}"
          style="width: ${metric.value}%"
        ></span>
      </div>
      <p class="geo-assessment-v2__metric-status">${metric.statusLabel}</p>
    </article>
  `;
}

function renderMetricCards(metrics: GeoReportMetric[]) {
  const sortedMetrics = [...metrics].sort(
    (a, b) => METRIC_DISPLAY_ORDER.indexOf(a.id) - METRIC_DISPLAY_ORDER.indexOf(b.id),
  );
  return html`
    <div class="geo-assessment-v2__metrics-row">
      ${sortedMetrics.map((metric) => renderMetricCard(metric))}
    </div>
  `;
}

function renderIndustrySection(report: GeoReport) {
  const { industryAnalysis } = report;
  return html`
    <section class="geo-assessment-v2__card geo-assessment-v2__industry">
      <header class="geo-assessment-v2__industry-head">
        <div>
          <h2 class="geo-assessment-v2__card-title">${t("geo.assessment.industryScoreTitle")}</h2>
          <p class="geo-assessment-v2__industry-hint">${t("geo.assessment.industryScoreHint")}</p>
        </div>
        <button type="button" class="geo-assessment-v2__chart-config" disabled>
          ${t("geo.assessment.chartConfig")} ${icons.chevronDown}
        </button>
      </header>
      <div class="geo-assessment-v2__industry-body">
        <div class="geo-assessment-v2__industry-chart">
          <h3 class="geo-assessment-v2__section-title">
            ${t("geo.assessment.historicalVisibility")}
          </h3>
          ${renderVisibilityTrendChart(industryAnalysis.trend, industryAnalysis.currentVisibility)}
          <div class="geo-assessment-v2__chart-legend">
            <label class="geo-assessment-v2__legend-item geo-assessment-v2__legend-item--active">
              <input type="checkbox" checked disabled />
              ${t("geo.assessment.currentPeriod")}
            </label>
            <label class="geo-assessment-v2__legend-item">
              <input type="checkbox" disabled />
              ${t("geo.assessment.compareCompetitors")}
            </label>
          </div>
        </div>
        <div class="geo-assessment-v2__industry-ranking">
          <geo-assessment-ranking .industryAnalysis=${industryAnalysis}></geo-assessment-ranking>
        </div>
      </div>
    </section>
  `;
}

function renderGapItem(gap: GeoReportGap, index: number) {
  return html`
    <article class="geo-gap">
      <div class="geo-gap__icon" aria-hidden="true">${GAP_ICONS[index % GAP_ICONS.length]}</div>
      <div class="geo-gap__body">
        <div class="geo-gap__head">
          <h3 class="geo-gap__title">${gap.title}</h3>
          <span class="geo-gap__impact geo-gap__impact--${gap.impact}">
            ${t(`geo.assessment.impact.${gap.impact}`)}
          </span>
        </div>
        <p class="geo-gap__description">${gap.description}</p>
        <button type="button" class="btn btn--sm geo-gap__details" disabled>
          ${t("geo.assessment.viewDetails")}
        </button>
      </div>
    </article>
  `;
}

function renderGapsCollapsible(gaps: GeoReportGap[]) {
  return html`
    <details class="geo-assessment-v2__gaps">
      <summary class="geo-assessment-v2__gaps-toggle">
        ${t("geo.assessment.gapsToggle", { count: String(gaps.length) })}
        <span class="geo-assessment-v2__gaps-chevron" aria-hidden="true">${icons.chevronDown}</span>
      </summary>
      <div class="geo-assessment-v2__gap-list">
        ${gaps.map((gap, index) => renderGapItem(gap, index))}
      </div>
    </details>
  `;
}

function renderReportSkeleton() {
  return html`
    <div class="geo-assessment-v2 geo-assessment-v2--loading">
      <div class="geo-skeleton geo-skeleton__line geo-skeleton__line--title"></div>
      <div class="geo-assessment-v2__top-row">
        <div class="geo-assessment-v2__card geo-skeleton">
          <div class="geo-skeleton__ring"></div>
          <div class="geo-skeleton__line geo-skeleton__line--short"></div>
        </div>
        <div class="geo-assessment-v2__card geo-assessment-v2__advantages geo-skeleton">
          <div class="geo-assessment-v2__advantages-body">
            <div class="geo-skeleton__line geo-skeleton__line--title"></div>
            <div class="geo-skeleton__line"></div>
            <div class="geo-skeleton__line"></div>
          </div>
          <div class="geo-assessment-v2__advantages-footer">
            <div class="geo-skeleton__line geo-skeleton__line--cta"></div>
          </div>
        </div>
      </div>
      <div class="geo-assessment-v2__metrics-row">
        ${[0, 1, 2].map(
          () => html`<div class="geo-assessment-v2__card geo-skeleton geo-skeleton__metric"></div>`,
        )}
      </div>
      <div class="geo-assessment-v2__card geo-skeleton geo-skeleton__industry"></div>
    </div>
  `;
}

function renderReportContent(report: GeoReport, canFix: boolean, onFixGaps: () => void) {
  return html`
    <div class="geo-assessment-v2">
      <h1 class="geo-assessment-v2__title">${t("geo.assessment.pageTitle")}</h1>
      <div class="geo-assessment-v2__top-row">
        ${renderScoreCard(report)} ${renderAdvantagesCard(report, canFix, onFixGaps)}
      </div>
      ${renderMetricCards(report.metrics)} ${renderIndustrySection(report)}
      ${renderGapsCollapsible(report.gaps)}
    </div>
  `;
}

export function renderGeoAssessment(props: GeoAssessmentProps) {
  const loading = props.starting || props.reportStatus === "loading";
  const ready = props.reportStatus === "ready" && props.report;
  const canFix = Boolean(ready) && !props.skillBusy;

  const header = html`
    <header class="geo-page__header">
      <div class="geo-page__brand">
        <span class="geo-assessment__logo">OpenBrand</span>
        <span class="geo-page__badge">${t("geo.assessment.badge")}</span>
      </div>
      <div class="geo-page__header-actions">
        <button type="button" class="btn btn--sm" @click=${props.onBack}>${t("geo.back")}</button>
      </div>
    </header>
  `;

  const content = html`
    <section class="geo-assessment__report">
      ${loading && !ready ? renderReportSkeleton() : nothing}
      ${ready ? renderReportContent(props.report!, canFix, props.onFixGaps) : nothing}
      ${!loading && props.reportStatus === "error"
        ? html`
            <div class="geo-assessment__error callout warn" role="status">
              <strong>${t("geo.assessment.reportErrorTitle")}</strong>
              <p>${t("geo.assessment.reportErrorBody")}</p>
            </div>
          `
        : nothing}
    </section>
  `;

  return renderGeoFlowLayout({
    siteUrl: props.siteUrl,
    chatOpen: props.chatOpen,
    chatSlot: props.chatSlot,
    onToggleChat: props.onToggleChat,
    header,
    children: content,
    llmProgress: buildGeoLlmProgress({
      skillBusy: props.skillBusy,
      starting: props.starting,
      reportStatus: props.reportStatus,
      phase: "assessment",
      pendingSkill: props.pendingSkill,
    }),
  });
}
