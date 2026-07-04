import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import type {
  GeoDataStatus,
  GeoOutputCategory,
  GeoOutputCenter,
  GeoOutputRepairTag,
  GeoSkillAction,
} from "../geo-parsers.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoOutputCenterProps = {
  siteUrl: string;
  pendingSkill: GeoSkillAction | null;
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

const IMPACT_ORDER: Record<GeoOutputCategory["impact"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const TAG_I18N: Record<GeoOutputRepairTag, string> = {
  techInfra: "geo.outputCenter.tagTechInfra",
  brandContent: "geo.outputCenter.tagBrandContent",
  structure: "geo.outputCenter.tagStructure",
  continuousArticle: "geo.outputCenter.tagContinuousArticle",
};

function sortByImpact(categories: GeoOutputCategory[]): GeoOutputCategory[] {
  return [...categories].sort((left, right) => IMPACT_ORDER[left.impact] - IMPACT_ORDER[right.impact]);
}

function renderCategoryCard(
  category: GeoOutputCategory,
  onOpen: () => void,
  disabled: boolean,
) {
  return html`
    <button
      type="button"
      class="geo-output-category-card geo-output-category-card--${category.impact}"
      ?disabled=${disabled}
      @click=${onOpen}
    >
      <div class="geo-output-category-card__head">
        <h3 class="geo-output-category-card__title">${category.title}</h3>
        <span class="geo-gap__impact geo-gap__impact--${category.impact}">
          ${t(`geo.assessment.impact.${category.impact}`)}
        </span>
      </div>
      <p class="geo-output-category-card__description">${category.description}</p>
      <div class="geo-output-category-card__tags">
        ${category.tags.map(
          (tag) => html`
            <span class="geo-output-category-card__tag">${t(TAG_I18N[tag])}</span>
          `,
        )}
      </div>
    </button>
  `;
}

function renderCategorySkeletonCards() {
  return [0, 1, 2, 3].map(
    () => html`
      <article class="geo-output-category-card geo-output-category-card--skeleton geo-skeleton" aria-hidden="true">
        <div class="geo-skeleton__line geo-skeleton__line--title"></div>
        <div class="geo-skeleton__line"></div>
        <div class="geo-skeleton__line geo-skeleton__line--short"></div>
      </article>
    `,
  );
}

export function renderGeoOutputCenter(props: GeoOutputCenterProps) {
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !props.output;
  const categories = props.output?.categories ?? [];
  const sortedCategories = sortByImpact(categories);
  const statusText = props.output
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
    <div class="geo-output-center__body ${loading ? "geo-brand-story__body--dimmed" : ""}">
      <main class="geo-output-center__main">
        <div class="geo-output-center__title-row">
          <div>
            <h1 class="geo-output-center__title">${t("geo.outputCenter.title")}</h1>
            <p class="geo-output-center__subtitle">${t("geo.outputCenter.subtitle")}</p>
          </div>
          <button
            type="button"
            class="geo-page__cta"
            ?disabled=${loading || sortedCategories.length === 0}
            @click=${props.onOpenRepairPack}
          >
            ${t("geo.outputCenter.optimizeOneClick")}
          </button>
        </div>
        <div class="geo-output-center__grid">
          ${loading && sortedCategories.length === 0
            ? renderCategorySkeletonCards()
            : sortedCategories.length > 0
              ? sortedCategories.map((category) =>
                  renderCategoryCard(category, props.onOpenRepairPack, loading),
                )
              : nothing}
        </div>
      </main>
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
      phase: "outputCenter",
      pendingSkill: props.pendingSkill,
    }),
  });
}
