import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import type { GeoDataStatus, GeoOutputAsset, GeoOutputCenter } from "../geo-parsers.ts";
import { DEMO_OUTPUT_ASSETS } from "../geo-demo-data.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoOutputCenterProps = {
  siteUrl: string;
  output: GeoOutputCenter | null;
  status: GeoDataStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onOpenRepairPack: () => void;
  onOpenMonitoringPanel: () => void;
  onRetry: () => void;
};

function resolveAssets(output: GeoOutputCenter | null, status: GeoDataStatus): GeoOutputAsset[] {
  if (output?.assets?.length) {
    return output.assets;
  }
  if (status === "idle") {
    return DEMO_OUTPUT_ASSETS;
  }
  return [];
}

function renderAssetCard(asset: GeoOutputAsset) {
  const typeLabel =
    asset.type === "article"
      ? t("geo.outputCenter.typeArticle")
      : asset.type === "faq"
        ? t("geo.outputCenter.typeFaq")
        : t("geo.outputCenter.typeCase");
  const scoreClass =
    asset.scoreTone === "good" ? "geo-output-card__score--good" : "geo-output-card__score--warn";

  return html`
    <article class="geo-output-card">
      <div class="geo-output-card__head">
        <span class="geo-output-card__type geo-output-card__type--${asset.type}">${typeLabel}</span>
        <span class="geo-output-card__score ${scoreClass}">
          GEO Score: ${asset.score}/100
        </span>
      </div>
      <h3 class="geo-output-card__title">${asset.title}</h3>
      <button type="button" class="btn btn--sm geo-output-card__btn" disabled>
        ${t("geo.outputCenter.optimize")}
      </button>
    </article>
  `;
}

export function renderGeoOutputCenter(props: GeoOutputCenterProps) {
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !props.output;
  const assets = resolveAssets(props.output, props.status);
  const brandVoice = props.output?.brandVoice ?? t("geo.outputCenter.brandVoice");
  const constraints = props.output?.constraints ?? t("geo.outputCenter.constraints");
  const statusText = loading
    ? t("geo.skills.loading")
    : props.output
      ? t("geo.outputCenter.subtitle")
      : t("geo.outputCenter.generatingStatus");

  const header = html`
    <header class="geo-page__header geo-output-center__header">
      <div class="geo-page__brand">
        <span class="geo-assessment__logo">OpenBrand</span>
        <span class="geo-page__status">${statusText}</span>
      </div>
      <div class="geo-page__header-actions">
        <span class="geo-page__pill">${t("geo.outputCenter.activityBadge")}</span>
        <button type="button" class="btn btn--sm" ?disabled=${loading} @click=${props.onOpenRepairPack}>
          ${t("geo.outputCenter.technicalFix")}
        </button>
        <button
          type="button"
          class="btn btn--sm"
          ?disabled=${loading}
          @click=${props.onOpenMonitoringPanel}
        >
          ${t("geo.outputCenter.monitoringPanel")}
        </button>
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.outputCenter.backToBrandStory")}
        </button>
        <button type="button" class="btn btn--sm" @click=${props.onExitToConsole}>
          ${t("geo.backToConsole")}
        </button>
      </div>
    </header>
  `;

  const content = html`
    ${loading
      ? html`<div class="geo-phase-loading geo-phase-loading--inline">
          <div class="geo-phase-loading__spinner" aria-hidden="true"></div>
          <p>${t("geo.skills.loading")}</p>
        </div>`
      : nothing}
    ${showError
      ? html`<div class="geo-phase-error geo-phase-error--inline">
          <p>${t("geo.skills.errorBody")}</p>
          <button type="button" class="btn btn--sm" @click=${props.onRetry}>
            ${t("geo.skills.retry")}
          </button>
        </div>`
      : nothing}
    <div class="geo-output-center__body">
      <main class="geo-output-center__main">
        <h1 class="geo-output-center__title">${t("geo.outputCenter.title")}</h1>
        <p class="geo-output-center__subtitle">${t("geo.outputCenter.subtitle")}</p>
        <div class="geo-output-center__grid">
          ${assets.length > 0
            ? assets.map((asset) => renderAssetCard(asset))
            : html`<p class="geo-phase-empty">${t("geo.skills.loading")}</p>`}
        </div>
      </main>
      <aside class="geo-output-center__aside">
        <section class="geo-side-card">
          <h2 class="geo-side-card__title">${t("geo.outputCenter.contextRules")}</h2>
          <p class="geo-side-card__hint">${brandVoice}</p>
          <p class="geo-side-card__hint">${constraints}</p>
          <button type="button" class="geo-page__cta geo-page__cta--block" disabled>
            ${t("geo.outputCenter.deployLlms")}
          </button>
        </section>
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
  });
}
