import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { deriveBrandNameFromUrl } from "../geo-demo-data.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import {
  GEO_VALUE_PROP_OTHER_ID,
  isGeoBrandStoryComplete,
  type GeoBrandStory,
  type GeoDataStatus,
  type GeoSkillAction,
} from "../geo-parsers.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoBrandStoryProps = {
  siteUrl: string;
  pendingSkill: GeoSkillAction | null;
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
  onValuePropsChange: (valueProps: string[], valuePropOther: string) => void;
};

function renderInlineError(onRetry: () => void) {
  return html`
    <div class="geo-phase-error geo-phase-error--inline">
      <h2>${t("geo.skills.errorTitle")}</h2>
      <p>${t("geo.skills.errorBody")}</p>
      <button type="button" class="btn btn--sm" @click=${onRetry}>${t("geo.skills.retry")}</button>
    </div>
  `;
}

function toggleValueProp(
  current: string[],
  id: string,
  checked: boolean,
  onChange: (valueProps: string[], valuePropOther: string) => void,
  valuePropOther: string,
) {
  const next = new Set(current);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  onChange([...next], valuePropOther);
}

export function renderGeoBrandStory(props: GeoBrandStoryProps) {
  const data = props.brandStory;
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !data;
  const skeletonName = loading && !data ? deriveBrandNameFromUrl(props.siteUrl) : "";
  const brandName = data?.brandName ?? skeletonName;
  const industry = data?.industry ?? "";
  const valuePropOptions = data?.valuePropOptions ?? [];
  const valueProps = data?.valueProps ?? [];
  const valuePropOther = data?.valuePropOther ?? "";
  const audience = data?.audience ?? "";
  const differentiator = data?.differentiator ?? "";
  const competitors = data?.competitors ?? [];
  const preview = data?.aiPreview;
  const canConfirm = isGeoBrandStoryComplete(data);
  const valuePropGap = !loading && valueProps.length === 0;
  const otherSelected = valueProps.includes(GEO_VALUE_PROP_OTHER_ID);
  const editable = !loading && Boolean(data);

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
      </div>
    </header>
  `;

  const content = html`
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
        <div class="geo-field ${valuePropGap ? "geo-field--gap" : ""}">
          <span class="geo-field__label">${t("geo.brandStory.valueProp")}</span>
          <p class="geo-field__hint">${t("geo.brandStory.valuePropHint")}</p>
          ${valuePropOptions.length > 0
            ? html`
                <div
                  class="geo-value-prop-options"
                  role="group"
                  aria-label=${t("geo.brandStory.valueProp")}
                >
                  ${valuePropOptions.map(
                    (option) => html`
                      <label class="geo-value-prop-option">
                        <input
                          type="checkbox"
                          .checked=${valueProps.includes(option.id)}
                          ?disabled=${!editable}
                          @change=${(event: Event) => {
                            toggleValueProp(
                              valueProps,
                              option.id,
                              (event.target as HTMLInputElement).checked,
                              props.onValuePropsChange,
                              valuePropOther,
                            );
                          }}
                        />
                        <span>${option.label}</span>
                      </label>
                    `,
                  )}
                </div>
              `
            : html` <p class="geo-field__placeholder">${t("geo.brandStory.gapPlaceholder")}</p> `}
          <label class="geo-value-prop-option geo-value-prop-option--other">
            <input
              type="checkbox"
              .checked=${otherSelected}
              ?disabled=${!editable}
              @change=${(event: Event) => {
                toggleValueProp(
                  valueProps,
                  GEO_VALUE_PROP_OTHER_ID,
                  (event.target as HTMLInputElement).checked,
                  props.onValuePropsChange,
                  valuePropOther,
                );
              }}
            />
            <span>${t("geo.brandStory.valuePropOther")}</span>
          </label>
          ${otherSelected
            ? html`
                <input
                  type="text"
                  class="geo-field__input geo-value-prop-other"
                  .value=${valuePropOther}
                  placeholder=${t("geo.brandStory.valuePropOtherPlaceholder")}
                  ?disabled=${!editable}
                  @input=${(event: Event) => {
                    props.onValuePropsChange(valueProps, (event.target as HTMLInputElement).value);
                  }}
                />
              `
            : nothing}
        </div>
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
    llmProgress: buildGeoLlmProgress({
      skillBusy: props.skillBusy,
      status: props.status,
      phase: "brandStory",
      pendingSkill: props.pendingSkill,
    }),
  });
}
