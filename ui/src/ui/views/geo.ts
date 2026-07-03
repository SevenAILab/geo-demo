import { html, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import { renderGeoAnalysis, type GeoAnalysisProps } from "./geo-analysis.ts";

export type GeoPhase = "landing" | "analysis";

export type GeoLandingProps = {
  siteUrl: string;
  starting: boolean;
  onSiteUrlChange: (next: string) => void;
  onStartExperience: () => void;
  onExitToConsole: () => void;
};

export type GeoProps = GeoLandingProps & {
  phase: GeoPhase;
  previewBlocked: boolean;
  analysisChatSlot?: TemplateResult;
  onBack: () => void;
  onPreviewBlocked: () => void;
};

const LANDING_STEPS = [
  {
    iconClass: "geo-step__icon--scan",
    icon: icons.search,
    titleKey: "geo.landing.steps.scan.title",
    bodyKey: "geo.landing.steps.scan.body",
  },
  {
    iconClass: "geo-step__icon--fix",
    icon: icons.wrench,
    titleKey: "geo.landing.steps.fix.title",
    bodyKey: "geo.landing.steps.fix.body",
  },
  {
    iconClass: "geo-step__icon--track",
    icon: icons.barChart,
    titleKey: "geo.landing.steps.track.title",
    bodyKey: "geo.landing.steps.track.body",
  },
] as const;

export function renderGeoLanding(props: GeoLandingProps) {
  return html`
    <div class="geo-landing">
      <header class="geo-landing__nav">
        <div class="geo-landing__nav-inner">
          <span class="geo-landing__logo">OpenBrand</span>
          <nav class="geo-landing__nav-links" aria-label=${t("geo.landing.navLabel")}>
            <span>${t("geo.landing.navProduct")}</span>
            <span>${t("geo.landing.navSolutions")}</span>
            <span>${t("geo.landing.navResources")}</span>
            <span>${t("geo.landing.navCompany")}</span>
          </nav>
          <div class="geo-landing__nav-actions">
            <button type="button" class="geo-landing__login">${t("geo.landing.login")}</button>
            <button type="button" class="geo-landing__cta" disabled>
              ${t("geo.landing.getStarted")}
            </button>
          </div>
        </div>
      </header>

      <main class="geo-landing__main">
        <section class="geo-landing__hero">
          <p class="geo-landing__eyebrow">
            <span class="geo-landing__eyebrow-icon" aria-hidden="true">${icons.globe}</span>
            ${t("geo.landing.eyebrow")}
          </p>
          <h1 class="geo-landing__title">${t("geo.landing.heroTitle")}</h1>
          <p class="geo-landing__subtitle">${t("geo.landing.heroSubtitle")}</p>

          <div class="geo-landing__search">
            <span class="geo-landing__search-icon" aria-hidden="true">${icons.globe}</span>
            <input
              type="url"
              class="geo-landing__search-input"
              .value=${props.siteUrl}
              placeholder=${t("geo.siteUrlPlaceholder")}
              ?disabled=${props.starting}
              @input=${(event: Event) =>
                props.onSiteUrlChange((event.target as HTMLInputElement).value)}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  props.onStartExperience();
                }
              }}
            />
            <button
              type="button"
              class="geo-landing__search-btn"
              ?disabled=${props.starting || !props.siteUrl.trim()}
              @click=${props.onStartExperience}
            >
              ${props.starting ? t("geo.starting") : t("geo.startExperience")}
            </button>
          </div>
          <p class="geo-landing__examples">${t("geo.landing.examples")}</p>
        </section>

        <section class="geo-landing__steps">
          <h2 class="geo-landing__steps-title">${t("geo.landing.stepsTitle")}</h2>
          <div class="geo-landing__steps-grid">
            ${LANDING_STEPS.map(
              (step) => html`
                <article class="geo-step">
                  <div class="geo-step__icon ${step.iconClass}">${step.icon}</div>
                  <h3 class="geo-step__title">${t(step.titleKey)}</h3>
                  <p class="geo-step__body">${t(step.bodyKey)}</p>
                </article>
              `,
            )}
          </div>
        </section>
      </main>

      <footer class="geo-landing__footer">
        <button type="button" class="geo-landing__console-link" @click=${props.onExitToConsole}>
          ${t("geo.backToConsole")}
        </button>
        <p class="geo-landing__footer-note">${t("geo.landing.footerNote")}</p>
      </footer>
    </div>
  `;
}

export function renderGeo(props: GeoProps) {
  if (props.phase === "analysis" && props.analysisChatSlot) {
    const analysisProps: GeoAnalysisProps = {
      siteUrl: props.siteUrl,
      previewBlocked: props.previewBlocked,
      chatSlot: props.analysisChatSlot,
      onBack: props.onBack,
      onExitToConsole: props.onExitToConsole,
      onPreviewBlocked: props.onPreviewBlocked,
    };
    return renderGeoAnalysis(analysisProps);
  }
  return renderGeoLanding(props);
}
