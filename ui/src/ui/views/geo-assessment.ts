import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import type { GeoReport, GeoReportStatus } from "../geo-report.ts";
import { icons } from "../icons.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import type { GeoSkillAction } from "../geo-parsers.ts";
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

function renderScoreRing(score: number) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  return html`
    <svg class="geo-score-ring" viewBox="0 0 140 140" aria-hidden="true">
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

function renderMetricBar(value: number) {
  return html`
    <div class="geo-metric__bar" aria-hidden="true">
      <span class="geo-metric__bar-fill" style="width: ${value}%"></span>
    </div>
  `;
}

function renderReportSkeleton() {
  return html`
    <div class="geo-assessment__report-grid geo-assessment__report-grid--loading">
      <div class="geo-assessment__score-card geo-skeleton">
        <div class="geo-skeleton__ring"></div>
        <div class="geo-skeleton__line geo-skeleton__line--short"></div>
        <div class="geo-skeleton__line"></div>
      </div>
      <div class="geo-assessment__gaps geo-skeleton">
        <div class="geo-skeleton__line geo-skeleton__line--title"></div>
        <div class="geo-skeleton__gap"></div>
        <div class="geo-skeleton__gap"></div>
        <div class="geo-skeleton__gap"></div>
      </div>
    </div>
  `;
}

function renderReportContent(report: GeoReport) {
  return html`
    <div class="geo-assessment__report-grid">
      <section class="geo-assessment__score-card">
        <p class="geo-assessment__score-label">${t("geo.assessment.totalScoreLabel")}</p>
        <div class="geo-assessment__score-ring-wrap">
          ${renderScoreRing(report.totalScore)}
          <div class="geo-assessment__score-value">
            <strong>${report.totalScore}</strong>
            <span>/100</span>
          </div>
        </div>
        <p class="geo-assessment__rating">
          ${t("geo.assessment.ratingLabel")}：
          <span class="geo-assessment__rating-pill geo-assessment__rating-pill--${report.rating}">
            ${t(`geo.assessment.rating.${report.rating}`)}
          </span>
        </p>
        <p class="geo-assessment__summary">${report.summary}</p>
        <div class="geo-assessment__metrics">
          ${report.metrics.map(
            (metric) => html`
              <div class="geo-metric">
                <div class="geo-metric__head">
                  <span class="geo-metric__label">${metric.label}</span>
                  <strong class="geo-metric__value">${metric.value}%</strong>
                </div>
                ${renderMetricBar(metric.value)}
                <span class="geo-metric__status">${metric.statusLabel}</span>
              </div>
            `,
          )}
        </div>
      </section>

      <section class="geo-assessment__gaps">
        <h2 class="geo-assessment__gaps-title">${t("geo.assessment.gapsTitle")}</h2>
        <div class="geo-assessment__gap-list">
          ${report.gaps.map(
            (gap, index) => html`
              <article class="geo-gap">
                <div class="geo-gap__icon" aria-hidden="true">
                  ${GAP_ICONS[index % GAP_ICONS.length]}
                </div>
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
            `,
          )}
        </div>
      </section>
    </div>
  `;
}

export function renderGeoAssessment(props: GeoAssessmentProps) {
  const loading = props.starting || props.reportStatus === "loading";
  const ready = props.reportStatus === "ready" && props.report;
  const canFix = Boolean(ready) && !props.skillBusy;

  const header = html`
    <header class="geo-assessment__header geo-page__header">
      <div class="geo-assessment__brand geo-page__brand">
        <div class="geo-assessment__brand-text">
          <span class="geo-assessment__logo">OpenBrand</span>
          <span class="geo-assessment__tagline">${t("geo.assessment.brandTagline")}</span>
        </div>
        <span class="geo-assessment__badge">${t("geo.assessment.reportVersion")}</span>
      </div>
      <div class="geo-assessment__header-actions geo-page__header-actions">
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.back")}
        </button>
        <button type="button" class="btn btn--sm" @click=${props.onExitToConsole}>
          ${t("geo.backToConsole")}
        </button>
        <button type="button" class="btn btn--sm" disabled>
          ${icons.download}
          ${t("geo.analysis.exportReport")}
        </button>
      </div>
    </header>
  `;

  const content = html`
    <section class="geo-assessment__report">
      ${loading && !ready ? renderReportSkeleton() : nothing}
      ${ready ? renderReportContent(props.report!) : nothing}
      ${!loading && props.reportStatus === "error"
        ? html`
            <div class="geo-assessment__error callout warn" role="status">
              <strong>${t("geo.assessment.reportErrorTitle")}</strong>
              <p>${t("geo.assessment.reportErrorBody")}</p>
            </div>
          `
        : nothing}
      <footer class="geo-assessment__footer">
        <button type="button" class="geo-assessment__share" disabled>
          ${t("geo.assessment.shareReport")}
        </button>
        <button
          type="button"
          class="geo-assessment__fix-btn"
          ?disabled=${!canFix}
          @click=${props.onFixGaps}
        >
          ${t("geo.assessment.fixGaps")}
        </button>
      </footer>
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
