import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import {
  DEMO_ARTICLE_PREVIEW,
  DEMO_DIMENSIONS,
  DEMO_RECENT_PUBLISHES,
  DEMO_TOPIC_CARDS,
} from "../geo-demo-data.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import type {
  GeoDataStatus,
  GeoDimension,
  GeoMonitoring,
  GeoSkillAction,
  GeoTopicCard,
} from "../geo-parsers.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoMonitoringPanelProps = {
  siteUrl: string;
  pendingSkill: GeoSkillAction | null;
  monitoring: GeoMonitoring | null;
  status: GeoDataStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onRetry: () => void;
};

function resolveDimensions(data: GeoMonitoring | null, status: GeoDataStatus): GeoDimension[] {
  if (data?.dimensions?.length) {
    return data.dimensions;
  }
  if (status === "idle") {
    return DEMO_DIMENSIONS;
  }
  return [];
}

function resolveTopics(data: GeoMonitoring | null, status: GeoDataStatus): GeoTopicCard[] {
  if (data?.topics?.length) {
    return data.topics;
  }
  if (status === "idle") {
    return DEMO_TOPIC_CARDS;
  }
  return [];
}

function renderDimensionBar(item: GeoDimension) {
  return html`
    <div class="geo-dimension">
      <div class="geo-dimension__head">
        <span>${item.label}</span>
        <strong>${item.value}%</strong>
      </div>
      <div class="geo-dimension__bar">
        <span
          class="geo-dimension__fill geo-dimension__fill--${item.tone}"
          style="width: ${item.value}%"
        ></span>
      </div>
    </div>
  `;
}

export function renderGeoMonitoringPanel(props: GeoMonitoringPanelProps) {
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !props.monitoring;
  const data = props.monitoring;
  const dimensions = resolveDimensions(data, props.status);
  const topics = resolveTopics(data, props.status);
  const recentPublishes = data?.recentPublishes?.length
    ? data.recentPublishes
    : DEMO_RECENT_PUBLISHES;
  const articlePreview = data?.articlePreview ?? DEMO_ARTICLE_PREVIEW;
  const readinessScore = data?.readinessScore ?? 0;
  const readinessDelta = data?.readinessDelta ?? t("geo.monitoringPanel.readinessDelta");

  const header = html`
    <header class="geo-page__header">
      <h1 class="geo-monitoring__title">${t("geo.monitoringPanel.title")}</h1>
      <div class="geo-page__header-actions">
        <span class="geo-page__lang" aria-disabled="true"
          >${t("geo.monitoringPanel.langToggle")}</span
        >
        <button
          type="button"
          class="btn btn--sm"
          disabled
          aria-label=${t("geo.monitoringPanel.notifications")}
        >
          🔔
        </button>
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.monitoringPanel.backToOutputCenter")}
        </button>
        // <button type="button" class="btn btn--sm" @click=${props.onExitToConsole}>
        //   ${t("geo.backToConsole")}
        // </button>
      </div>
    </header>
  `;

  const content = html`
    ${showError
      ? html`<div class="geo-phase-error geo-phase-error--inline">
          <p>${t("geo.skills.errorBody")}</p>
          <button type="button" class="btn btn--sm" @click=${props.onRetry}>
            ${t("geo.skills.retry")}
          </button>
        </div>`
      : nothing}
    <div class="geo-monitoring__body ${loading ? "geo-brand-story__body--dimmed" : ""}">
      <main class="geo-monitoring__main">
        <section class="geo-monitoring__readiness">
          <h2>${t("geo.monitoringPanel.readinessTitle")}</h2>
          <div class="geo-monitoring__ring-wrap">
            <div class="geo-monitoring__ring">
              ${data
                ? html`<span class="geo-monitoring__ring-score">${readinessScore}</span>`
                : nothing}
            </div>
            <span class="geo-monitoring__delta">${readinessDelta}</span>
          </div>
        </section>
        <section class="geo-monitoring__dimensions">
          <h2>${t("geo.monitoringPanel.dimensionsTitle")}</h2>
          ${dimensions.map((item) => renderDimensionBar(item))}
        </section>
        <section class="geo-monitoring__topics">
          <h2>${t("geo.monitoringPanel.topicsTitle")}</h2>
          <div class="geo-monitoring__topic-grid">
            ${topics.map(
              (card) => html`
                <article class="geo-topic-card">
                  <div class="geo-topic-card__head">
                    <h3>${card.title}</h3>
                    <span class="geo-topic-card__tag geo-topic-card__tag--${card.tag}">
                      ${card.tag === "missing"
                        ? t("geo.monitoringPanel.tagMissing")
                        : t("geo.monitoringPanel.tagInsight")}
                    </span>
                  </div>
                  <button type="button" class="btn btn--sm" disabled>
                    ${card.action === "comparison"
                      ? t("geo.monitoringPanel.generateComparison")
                      : t("geo.monitoringPanel.generateDeep")}
                  </button>
                </article>
              `,
            )}
          </div>
        </section>
        <section class="geo-monitoring__recent">
          <h2>${t("geo.monitoringPanel.recentTitle")}</h2>
          <ul class="geo-monitoring__recent-list">
            ${recentPublishes.map(
              (item) => html`
                <li>
                  <span>${item.title}</span>
                  <time>${item.ago}</time>
                </li>
              `,
            )}
          </ul>
        </section>
      </main>
      <aside class="geo-monitoring__preview">
        <div class="geo-monitoring__preview-head">
          <h2>${t("geo.monitoringPanel.previewTitle")}</h2>
          <button
            type="button"
            class="btn btn--sm"
            disabled
            aria-label=${t("geo.monitoringPanel.closePreview")}
          >
            ×
          </button>
        </div>
        <span class="geo-monitoring__preview-tag">${t("geo.monitoringPanel.previewTag")}</span>
        <div class="geo-monitoring__preview-body">${articlePreview}</div>
        <button type="button" class="geo-page__cta geo-page__cta--block" disabled>
          ${t("geo.monitoringPanel.publish")}
        </button>
      </aside>
    </div>
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
      status: props.status,
      phase: "monitoringPanel",
      pendingSkill: props.pendingSkill,
    }),
  });
}
