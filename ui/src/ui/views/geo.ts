import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";
import type { GeoReport, GeoReportStatus } from "../geo-report.ts";
import type {
  GeoBrandStory,
  GeoDataStatus,
  GeoMonitoring,
  GeoOutputCenter,
  GeoRepairPack,
  GeoSkillAction,
} from "../geo-parsers.ts";
import type { GeoPhase } from "../controllers/geo.ts";
import {
  formatGeoRunSiteLabel,
  geoPhaseProgressLabel,
  type GeoRunSnapshot,
} from "../geo-history.ts";
import { formatRelativeTimestamp } from "../format.ts";
import { renderGeoAssessment } from "./geo-assessment.ts";
import { renderGeoBrandStory } from "./geo-brand-story.ts";
import { renderGeoMonitoringPanel } from "./geo-monitoring-panel.ts";
import { renderGeoOutputCenter } from "./geo-output-center.ts";
import { renderGeoRepairPack } from "./geo-repair-pack.ts";

export type { GeoPhase };

export type GeoFlowChatProps = {
  siteUrl: string;
  chatOpen: boolean;
  flowChatSlot: TemplateResult;
  onToggleChat: () => void;
};

export type GeoLandingProps = {
  siteUrl: string;
  starting: boolean;
  skillBusy: boolean;
  history: GeoRunSnapshot[];
  resumeRun: GeoRunSnapshot | null;
  onSiteUrlChange: (next: string) => void;
  onStartExperience: () => void;
  onExitToConsole: () => void;
  onRestoreRun: (runId: string) => void;
  onContinueResume: () => void;
  onDismissResume: () => void;
};

export type GeoProps = GeoLandingProps &
  GeoFlowChatProps & {
    phase: GeoPhase;
    pendingSkill: GeoSkillAction | null;
    report: GeoReport | null;
    reportStatus: GeoReportStatus;
    brandStory: GeoBrandStory | null;
    brandStoryStatus: GeoDataStatus;
    outputCenter: GeoOutputCenter | null;
    outputStatus: GeoDataStatus;
    repairPack: GeoRepairPack | null;
    repairPackStatus: GeoDataStatus;
    monitoring: GeoMonitoring | null;
    monitoringStatus: GeoDataStatus;
    onBack: () => void;
    onBackToAssessment: () => void;
    onBackToBrandStory: () => void;
    onBackToOutputCenter: () => void;
    onFixGaps: () => void;
    onConfirmGenerate: () => void;
    onOpenRepairPack: () => void;
    onOpenMonitoringPanel: () => void;
    onReassess: () => void;
    onRetryBrandStory: () => void;
    onRetryOutput: () => void;
    onRetryRepairPack: () => void;
    onRetryMonitoring: () => void;
    onValuePropsChange: (valueProps: string[], valuePropOther: string) => void;
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

function renderGeoHistoryItem(run: GeoRunSnapshot, onRestoreRun: (runId: string) => void) {
  const score = run.report?.totalScore;
  return html`
    <button
      type="button"
      class="geo-history__item"
      @click=${() => onRestoreRun(run.id)}
    >
      <span class="geo-history__site">${formatGeoRunSiteLabel(run.siteUrl)}</span>
      <span class="geo-history__meta">
        <span class="geo-history__phase">${t(geoPhaseProgressLabel(run.phase))}</span>
        <span class="geo-history__time">${formatRelativeTimestamp(run.updatedAt)}</span>
        ${score != null
          ? html`<span class="geo-history__score">${t("geo.history.score", { score })}</span>`
          : nothing}
      </span>
    </button>
  `;
}

export function renderGeoLanding(props: GeoLandingProps) {
  const busy = props.starting || props.skillBusy;
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

          ${props.resumeRun
            ? html`
                <div class="geo-history__banner" role="status">
                  <p class="geo-history__banner-text">
                    ${t("geo.history.resumeBanner", {
                      url: formatGeoRunSiteLabel(props.resumeRun.siteUrl),
                    })}
                  </p>
                  <div class="geo-history__banner-actions">
                    <button
                      type="button"
                      class="geo-history__banner-continue"
                      ?disabled=${busy}
                      @click=${props.onContinueResume}
                    >
                      ${t("geo.history.continue")}
                    </button>
                    <button
                      type="button"
                      class="geo-history__banner-dismiss"
                      ?disabled=${busy}
                      @click=${props.onDismissResume}
                    >
                      ${t("geo.history.dismiss")}
                    </button>
                  </div>
                </div>
              `
            : nothing}

          <div class="geo-landing__search">
            <span class="geo-landing__search-icon" aria-hidden="true">${icons.globe}</span>
            <input
              type="url"
              class="geo-landing__search-input"
              .value=${props.siteUrl}
              placeholder=${t("geo.siteUrlPlaceholder")}
              ?disabled=${busy}
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
              ?disabled=${busy || !props.siteUrl.trim()}
              @click=${props.onStartExperience}
            >
              ${busy ? t("geo.starting") : t("geo.startExperience")}
            </button>
          </div>
          <p class="geo-landing__examples">${t("geo.landing.examples")}</p>
        </section>

        ${props.history.length > 0
          ? html`
              <section class="geo-history" aria-label=${t("geo.history.title")}>
                <h2 class="geo-history__title">${t("geo.history.title")}</h2>
                <div class="geo-history__list">
                  ${props.history.map((run) => renderGeoHistoryItem(run, props.onRestoreRun))}
                </div>
              </section>
            `
          : nothing}


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

const flowChatProps = (props: GeoProps) => ({
  siteUrl: props.siteUrl,
  chatOpen: props.chatOpen,
  chatSlot: props.flowChatSlot,
  onToggleChat: props.onToggleChat,
});

export function renderGeo(props: GeoProps) {
  if (props.phase === "assessment") {
    return renderGeoAssessment({
      ...flowChatProps(props),
      starting: props.starting,
      pendingSkill: props.pendingSkill,
      report: props.report,
      reportStatus: props.reportStatus,
      skillBusy: props.skillBusy,
      onBack: props.onBack,
      onExitToConsole: props.onExitToConsole,
      onFixGaps: props.onFixGaps,
    });
  }
  if (props.phase === "brandStory") {
    return renderGeoBrandStory({
      ...flowChatProps(props),
      pendingSkill: props.pendingSkill,
      brandStory: props.brandStory,
      status: props.brandStoryStatus,
      skillBusy: props.skillBusy,
      onBack: props.onBackToAssessment,
      onExitToConsole: props.onExitToConsole,
      onConfirmGenerate: props.onConfirmGenerate,
      onRetry: props.onRetryBrandStory,
      onValuePropsChange: props.onValuePropsChange,
    });
  }
  if (props.phase === "outputCenter") {
    return renderGeoOutputCenter({
      ...flowChatProps(props),
      pendingSkill: props.pendingSkill,
      output: props.outputCenter,
      status: props.outputStatus,
      skillBusy: props.skillBusy,
      onBack: props.onBackToBrandStory,
      onExitToConsole: props.onExitToConsole,
      onOpenRepairPack: props.onOpenRepairPack,
      onOpenMonitoringPanel: props.onOpenMonitoringPanel,
      onRetry: props.onRetryOutput,
    });
  }
  if (props.phase === "repairPack") {
    return renderGeoRepairPack({
      ...flowChatProps(props),
      pendingSkill: props.pendingSkill,
      repairPack: props.repairPack,
      status: props.repairPackStatus,
      skillBusy: props.skillBusy,
      onBack: props.onBackToOutputCenter,
      onExitToConsole: props.onExitToConsole,
      onReassess: props.onReassess,
      onRetry: props.onRetryRepairPack,
    });
  }
  if (props.phase === "monitoringPanel") {
    return renderGeoMonitoringPanel({
      ...flowChatProps(props),
      pendingSkill: props.pendingSkill,
      monitoring: props.monitoring,
      status: props.monitoringStatus,
      skillBusy: props.skillBusy,
      onBack: props.onBackToOutputCenter,
      onExitToConsole: props.onExitToConsole,
      onRetry: props.onRetryMonitoring,
    });
  }
  return renderGeoLanding(props);
}
