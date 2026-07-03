import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { isGeoBrandStoryComplete, type GeoBrandStory, type GeoDataStatus } from "../geo-parsers.ts";
import { deriveBrandNameFromUrl } from "../geo-demo-data.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoBrandStoryProps = {
  siteUrl: string;
  brandStory: GeoBrandStory | null;
  status: GeoDataStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onConfirmGenerate: () => void;
  onRetry: () => void;
};

function renderInlineLoading() {
  return html`
    <div class="geo-phase-loading geo-phase-loading--inline">
      <div class="geo-phase-loading__spinner" aria-hidden="true"></div>
      <p>${t("geo.skills.loading")}</p>
    </div>
  `;
}

function renderInlineError(onRetry: () => void) {
  return html`
    <div class="geo-phase-error geo-phase-error--inline">
      <h2>${t("geo.skills.errorTitle")}</h2>
      <p>${t("geo.skills.errorBody")}</p>
      <button type="button" class="btn btn--sm" @click=${onRetry}>${t("geo.skills.retry")}</button>
    </div>
  `;
}

export function renderGeoBrandStory(props: GeoBrandStoryProps) {
  const data = props.brandStory;
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !data;
  const skeletonName = loading && !data ? deriveBrandNameFromUrl(props.siteUrl) : "";
  const brandName = data?.brandName ?? skeletonName;
  const industry = data?.industry ?? "";
  const valueProp = data?.valueProp ?? "";
  const audience = data?.audience ?? "";
  const differentiator = data?.differentiator ?? "";
  const competitors = data?.competitors ?? [];
  const preview = data?.aiPreview;
  const canConfirm = isGeoBrandStoryComplete(data);

  const header = html`
    <header class="geo-page__header">
      <div class="geo-page__brand">
        <span class="geo-assessment__logo">OpenBrand</span>
        <span class="geo-page__badge">${t("geo.brandStory.badge")}</span>
      </div>
      <div class="geo-page__header-actions">
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.brandStory.backToAssessment")}
        </button>
        <button type="button" class="btn btn--sm" @click=${props.onExitToConsole}>
          ${t("geo.backToConsole")}
        </button>
      </div>
    </header>
  `;

  const content = html`
    ${loading ? renderInlineLoading() : nothing}
    ${showError ? renderInlineError(props.onRetry) : nothing}
    <div class="geo-brand-story__body ${loading ? "geo-brand-story__body--dimmed" : ""}">
      <section class="geo-brand-story__form">
        <h1 class="geo-brand-story__title">${t("geo.brandStory.title")}</h1>
        <label class="geo-field">
          <span class="geo-field__label">${t("geo.brandStory.brandName")}</span>
          <input type="text" class="geo-field__input" .value=${brandName} readonly />
        </label>
        <label class="geo-field">
          <span class="geo-field__label">${t("geo.brandStory.industry")}</span>
          <input type="text" class="geo-field__input" .value=${industry} readonly />
        </label>
        <label class="geo-field ${!valueProp ? "geo-field--gap" : ""}">
          <span class="geo-field__label">${t("geo.brandStory.valueProp")}</span>
          <input
            type="text"
            class="geo-field__input"
            .value=${valueProp}
            placeholder=${t("geo.brandStory.gapPlaceholder")}
            readonly
          />
        </label>
        <label class="geo-field">
          <span class="geo-field__label">${t("geo.brandStory.audience")}</span>
          <input type="text" class="geo-field__input" .value=${audience} readonly />
        </label>
        <label class="geo-field ${!differentiator ? "geo-field--gap" : ""}">
          <span class="geo-field__label">${t("geo.brandStory.differentiator")}</span>
          <textarea
            class="geo-field__textarea"
            rows="3"
            .value=${differentiator}
            placeholder=${t("geo.brandStory.gapPlaceholder")}
            readonly
          ></textarea>
        </label>
      </section>

      <aside class="geo-brand-story__aside">
        <section class="geo-side-card">
          <h2 class="geo-side-card__title">${t("geo.brandStory.competitorTitle")}</h2>
          <p class="geo-side-card__hint">${t("geo.brandStory.competitorHint")}</p>
          ${competitors.length > 0
            ? html`<ul class="geo-competitor-list">
                ${competitors.map((url) => html`<li>${url}</li>`)}
              </ul>`
            : html`
                <input
                  type="url"
                  class="geo-field__input"
                  placeholder=${t("geo.brandStory.competitorPlaceholder")}
                  readonly
                />
              `}
        </section>
        <section class="geo-side-card">
          <h2 class="geo-side-card__title">${t("geo.brandStory.aiPreviewTitle")}</h2>
          <div class="geo-ai-preview">
            <p><strong>Entity:</strong> ${preview?.entity ?? data?.brandName ?? ""}</p>
            <p><strong>Type:</strong> ${preview?.type ?? ""}</p>
            <p><strong>Audience:</strong> ${preview?.audience ?? data?.audience ?? ""}</p>
            ${loading
              ? html`<p class="geo-ai-preview__status">${t("geo.brandStory.aiPreviewStatus")}</p>`
              : nothing}
          </div>
        </section>
      </aside>
    </div>
  `;

  const footer = html`
    <footer class="geo-page__footer">
      <button
        type="button"
        class="geo-page__cta"
        ?disabled=${loading || !canConfirm}
        @click=${props.onConfirmGenerate}
      >
        ${t("geo.brandStory.confirmGenerate")}
      </button>
    </footer>
  `;

  return renderGeoFlowLayout({
    siteUrl: props.siteUrl,
    chatOpen: props.chatOpen,
    chatSlot: props.chatSlot,
    onToggleChat: props.onToggleChat,
    header,
    footer,
    children: content,
  });
}
