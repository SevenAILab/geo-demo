import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { DEMO_JSON_LD, DEMO_LLMS_TXT } from "../geo-demo-data.ts";
import { buildGeoLlmProgress } from "../geo-llm-busy.ts";
import type { GeoDataStatus, GeoRepairPack, GeoSkillAction } from "../geo-parsers.ts";
import { icons } from "../icons.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoRepairPackProps = {
  siteUrl: string;
  pendingSkill: GeoSkillAction | null;
  repairPack: GeoRepairPack | null;
  status: GeoDataStatus;
  skillBusy: boolean;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  onBack: () => void;
  onExitToConsole: () => void;
  onReassess: () => void;
  onRetry: () => void;
};

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard unavailable
  }
}

function resolveContent(pack: GeoRepairPack | null, status: GeoDataStatus): GeoRepairPack {
  if (pack) {
    return pack;
  }
  if (status === "idle") {
    return { jsonLd: DEMO_JSON_LD, llmsTxt: DEMO_LLMS_TXT };
  }
  return { jsonLd: "", llmsTxt: "" };
}

function renderCopyButton(label: string, text: string, disabled: boolean) {
  return html`
    <button
      type="button"
      class="btn btn--sm primary geo-code-block__copy"
      ?disabled=${disabled}
      @click=${() => void copyText(text)}
    >
      ${icons.copy} ${label}
    </button>
  `;
}

function renderInstallStep(index: number, text: string) {
  return html`
    <li class="geo-repair-pack__step">
      <span class="geo-repair-pack__step-index">${index}</span>
      <span class="geo-repair-pack__step-text">${text}</span>
    </li>
  `;
}

export function renderGeoRepairPack(props: GeoRepairPackProps) {
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !props.repairPack;
  const packContent = resolveContent(props.repairPack, props.status);

  const header = html`
    <header class="geo-page__header">
      <div class="geo-page__brand">
        <span class="geo-assessment__logo">OpenBrand</span>
        <span class="geo-page__badge">${t("geo.flow.phases.repairPack")}</span>
      </div>
      <div class="geo-page__header-actions">
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.repairPack.backToOutputCenter")}
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
    <div class="geo-repair-pack__body ${loading ? "geo-brand-story__body--dimmed" : ""}">
      <div class="geo-repair-pack__hero">
        <div class="geo-repair-pack__hero-text">
          <div class="geo-repair-pack__title-row">
            <h1 class="geo-repair-pack__title">${t("geo.repairPack.title")}</h1>
            <span class="geo-page__badge">${t("geo.repairPack.badge")}</span>
          </div>
          <p class="geo-repair-pack__intro">${t("geo.repairPack.intro")}</p>
        </div>
        <span class="geo-page__ready geo-page__ready--live">
          <span class="geo-page__ready-dot" aria-hidden="true"></span>
          ${t("geo.repairPack.systemReady")}
        </span>
      </div>
      <main class="geo-repair-pack__main">
        <section class="geo-code-block">
          <div class="geo-code-block__head">
            <div class="geo-code-block__head-left">
              <span class="geo-code-block__tag">${t("geo.repairPack.schemaTag")}</span>
              <h2>${t("geo.repairPack.schemaTitle")}</h2>
            </div>
            ${renderCopyButton(
              t("geo.repairPack.copyJsonLd"),
              packContent.jsonLd,
              !packContent.jsonLd,
            )}
          </div>
          <pre class="geo-code-block__content"><code>${packContent.jsonLd}</code></pre>
        </section>
        <section class="geo-code-block">
          <div class="geo-code-block__head">
            <div class="geo-code-block__head-left">
              <span class="geo-code-block__tag">${t("geo.repairPack.llmsTag")}</span>
              <h2>${t("geo.repairPack.llmsTitle")}</h2>
            </div>
            ${renderCopyButton(
              t("geo.repairPack.copyContent"),
              packContent.llmsTxt,
              !packContent.llmsTxt,
            )}
          </div>
          <pre
            class="geo-code-block__content geo-code-block__content--lines"
          ><code>${packContent.llmsTxt}</code></pre>
        </section>
      </main>
      <aside class="geo-repair-pack__aside">
        <section class="geo-side-card">
          <h2 class="geo-side-card__title">${t("geo.repairPack.installTitle")}</h2>
          <ol class="geo-repair-pack__steps">
            ${renderInstallStep(1, t("geo.repairPack.stepJsonLd"))}
            ${renderInstallStep(2, t("geo.repairPack.stepLlms"))}
            ${renderInstallStep(3, t("geo.repairPack.stepFaq"))}
          </ol>
          <div class="geo-repair-pack__scan">
            <div class="geo-repair-pack__scan-radar" aria-hidden="true">
              <span class="geo-repair-pack__scan-ring geo-repair-pack__scan-ring--outer"></span>
              <span class="geo-repair-pack__scan-ring geo-repair-pack__scan-ring--mid"></span>
              <span class="geo-repair-pack__scan-ring geo-repair-pack__scan-ring--inner"></span>
              <span class="geo-repair-pack__scan-dot"></span>
            </div>
            <span class="geo-repair-pack__scan-label">${t("geo.repairPack.scanDecor")}</span>
          </div>
        </section>
      </aside>
    </div>
  `;

  const footer = html`
    <footer class="geo-page__footer geo-page__footer--split">
      <p class="geo-page__footer-note">${t("geo.repairPack.footerNote")}</p>
      <button type="button" class="geo-page__cta" ?disabled=${loading} @click=${props.onReassess}>
        ${t("geo.repairPack.reassess")}
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
      phase: "repairPack",
      pendingSkill: props.pendingSkill,
    }),
  });
}
