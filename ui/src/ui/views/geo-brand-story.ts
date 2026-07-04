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
import { icons } from "../icons.ts";
import { computeBrandProfileStats } from "./geo-brand-profile-stats.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoBrandStoryProps = {
  siteUrl: string;
  pendingSkill: GeoSkillAction | null;
  brandStory: GeoBrandStory | null;
  status: GeoDataStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  draftSavedFlash: boolean;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onConfirmGenerate: () => void;
  onSaveDraft: () => void;
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

function renderFieldLabel(label: string, required = false) {
  return html`
    <div class="geo-brand-profile__label-row">
      <span class="geo-field__label">${label}</span>
      ${required
        ? html`<span class="geo-brand-profile__required">${t("geo.brandStory.requiredLabel")}</span>`
        : nothing}
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
  const brandName = data?.brandName?.trim() || deriveBrandNameFromUrl(props.siteUrl);
  const industry = data?.industry ?? "";
  const valuePropOptions = data?.valuePropOptions ?? [];
  const valueProps = data?.valueProps ?? [];
  const valuePropOther = data?.valuePropOther ?? "";
  const audience = data?.audience ?? "";
  const differentiator = data?.differentiator ?? "";
  const competitors = data?.competitors ?? [];
  const competitorText = competitors.filter(Boolean).join("\n");
  const canConfirm = isGeoBrandStoryComplete(data);
  const valuePropGap = !loading && valueProps.length === 0;
  const otherSelected = valueProps.includes(GEO_VALUE_PROP_OTHER_ID);
  const editable = !loading && Boolean(data);
  const stats = computeBrandProfileStats(data);

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
    ${!loading || data
      ? html`
          <div class="geo-brand-profile__banner" role="status">
            <span class="geo-brand-profile__banner-icon" aria-hidden="true">i</span>
            ${t("geo.brandStory.bannerSummary", {
              identified: String(stats.identified.length),
              gaps: String(stats.gaps.length),
            })}
          </div>
        `
      : nothing}
    <div class="geo-brand-story__body ${loading ? "geo-brand-story__body--dimmed" : ""}">
      <section class="geo-brand-profile__card">
        <div class="geo-brand-profile__card-header">
          <div>
            <h1 class="geo-brand-story__title">${t("geo.brandStory.title")}</h1>
            <p class="geo-brand-profile__subtitle">${t("geo.brandStory.subtitle")}</p>
          </div>
          <span class="geo-brand-profile__progress-badge">
            ${t("geo.brandStory.completenessBadge", { percent: String(stats.percent) })}
          </span>
        </div>

        <div class="geo-brand-profile__grid">
          <label class="geo-field">
            ${renderFieldLabel(t("geo.brandStory.brandName"))}
            <input type="text" class="geo-field__input" .value=${brandName} readonly />
          </label>
          <label class="geo-field">
            ${renderFieldLabel(t("geo.brandStory.industry"))}
            <input type="text" class="geo-field__input" .value=${industry} readonly />
          </label>
          <label class="geo-field">
            ${renderFieldLabel(t("geo.brandStory.audience"))}
            <input type="text" class="geo-field__input" .value=${audience} readonly />
          </label>
          <label class="geo-field">
            ${renderFieldLabel(t("geo.brandStory.competitorTitle"))}
            <textarea
              class="geo-field__textarea geo-brand-profile__competitors"
              rows="2"
              .value=${competitorText}
              placeholder=${t("geo.brandStory.competitorPlaceholder")}
              readonly
            ></textarea>
          </label>
        </div>

        <div class="geo-field geo-brand-profile__full ${valuePropGap ? "geo-field--gap" : ""}">
          ${renderFieldLabel(t("geo.brandStory.valueProp"), true)}
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

        <label class="geo-field geo-brand-profile__full ${!differentiator ? "geo-field--gap" : ""}">
          ${renderFieldLabel(t("geo.brandStory.differentiator"), true)}
          <textarea
            class="geo-field__textarea"
            rows="3"
            .value=${differentiator}
            placeholder=${t("geo.brandStory.gapPlaceholder")}
            readonly
          ></textarea>
        </label>

        <div class="geo-brand-profile__actions">
          <button
            type="button"
            class="geo-brand-profile__btn geo-brand-profile__btn--secondary"
            ?disabled=${loading || !data}
            @click=${props.onSaveDraft}
          >
            ${t("geo.brandStory.saveDraft")}
          </button>
          <button
            type="button"
            class="geo-brand-profile__btn geo-brand-profile__btn--primary"
            ?disabled=${loading || !canConfirm}
            @click=${props.onConfirmGenerate}
          >
            ${t("geo.brandStory.confirmGenerate")}
          </button>
        </div>
      </section>

      <aside class="geo-brand-story__aside">
        <section class="geo-side-card geo-brand-profile__checklist">
          <div class="geo-brand-profile__side-head">
            <h2 class="geo-side-card__title">${t("geo.brandStory.checklistTitle")}</h2>
            <span class="geo-brand-profile__count-badge">
              ${t("geo.brandStory.itemCount", { count: String(stats.gaps.length) })}
            </span>
          </div>
          <div class="geo-brand-profile__completeness">
            <div class="geo-brand-profile__completeness-row">
              <span>${t("geo.brandStory.completenessLabel")}</span>
              <strong>${stats.percent}%</strong>
            </div>
            <div class="geo-brand-profile__progress-bar" aria-hidden="true">
              <span class="geo-brand-profile__progress-fill" style="width: ${stats.percent}%"></span>
            </div>
          </div>
          ${stats.gaps.length > 0
            ? html`
                <ol class="geo-brand-profile__gap-list">
                  ${stats.gaps.map(
                    (gap, index) => html`
                      <li class="geo-brand-profile__gap-item">
                        <span class="geo-brand-profile__gap-index">${index + 1}</span>
                        <div class="geo-brand-profile__gap-body">
                          <strong>${t(gap.titleKey)}</strong>
                          <p>${t(gap.descKey)}</p>
                        </div>
                        <span class="geo-brand-profile__missing">${t("geo.brandStory.missingLabel")}</span>
                      </li>
                    `,
                  )}
                </ol>
              `
            : html`<p class="geo-brand-profile__all-done">${t("geo.brandStory.allComplete")}</p>`}
        </section>

        <section class="geo-side-card geo-brand-profile__identified">
          <div class="geo-brand-profile__side-head">
            <h2 class="geo-side-card__title">${t("geo.brandStory.identifiedTitle")}</h2>
            <span class="geo-brand-profile__count-badge">
              ${t("geo.brandStory.itemCount", { count: String(stats.identified.length) })}
            </span>
          </div>
          ${stats.identified.length > 0
            ? html`
                <ul class="geo-brand-profile__identified-list">
                  ${stats.identified.map(
                    (item) => html`
                      <li class="geo-brand-profile__identified-item">
                        <span class="geo-brand-profile__identified-check" aria-hidden="true"
                          >${icons.check}</span
                        >
                        <div class="geo-brand-profile__identified-body">
                          <strong>${t(item.labelKey)}</strong>
                          <p>${item.value}</p>
                        </div>
                      </li>
                    `,
                  )}
                </ul>
              `
            : html`<p class="geo-field__placeholder">${t("geo.brandStory.gapPlaceholder")}</p>`}
        </section>
      </aside>
    </div>
    ${props.draftSavedFlash
      ? html`
          <div class="geo-brand-profile__toast" role="status" aria-live="polite">
            <span class="geo-brand-profile__toast-icon" aria-hidden="true">${icons.check}</span>
            ${t("geo.brandStory.draftSaved")}
          </div>
        `
      : nothing}
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
      phase: "brandStory",
      pendingSkill: props.pendingSkill,
    }),
  });
}
