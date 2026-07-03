import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import type { GeoDataStatus, GeoRepairPack } from "../geo-parsers.ts";
import { DEMO_JSON_LD, DEMO_LLMS_TXT } from "../geo-demo-data.ts";
import { renderGeoFlowLayout } from "./geo-flow-layout.ts";

export type GeoRepairPackProps = {
  siteUrl: string;
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

export function renderGeoRepairPack(props: GeoRepairPackProps) {
  const loading = props.status === "loading" || props.skillBusy;
  const showError = props.status === "error" && !props.repairPack;
  const packContent = resolveContent(props.repairPack, props.status);

  const header = html`
    <header class="geo-page__header">
      <div class="geo-page__brand">
        <div>
          <h1 class="geo-repair-pack__title">${t("geo.repairPack.title")}</h1>
          <span class="geo-page__badge">${t("geo.repairPack.badge")}</span>
        </div>
        <p class="geo-repair-pack__intro">${t("geo.repairPack.intro")}</p>
      </div>
      <div class="geo-page__header-actions">
        <span class="geo-page__ready">${loading ? t("geo.skills.loading") : t("geo.repairPack.systemReady")}</span>
        <button type="button" class="btn btn--sm" @click=${props.onBack}>
          ${t("geo.repairPack.backToOutputCenter")}
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
    <div class="geo-repair-pack__body">
      <main class="geo-repair-pack__main">
        <section class="geo-code-block">
          <div class="geo-code-block__head">
            <h2>${t("geo.repairPack.schemaTitle")}</h2>
            <button
              type="button"
              class="btn btn--sm geo-code-block__copy"
              ?disabled=${!packContent.jsonLd}
              @click=${() => void copyText(packContent.jsonLd)}
            >
              ${t("geo.repairPack.copyJsonLd")}
            </button>
          </div>
          <pre class="geo-code-block__content"><code>${packContent.jsonLd || t("geo.skills.loading")}</code></pre>
        </section>
        <section class="geo-code-block">
          <div class="geo-code-block__head">
            <h2>${t("geo.repairPack.llmsTitle")}</h2>
            <button
              type="button"
              class="btn btn--sm geo-code-block__copy"
              ?disabled=${!packContent.llmsTxt}
              @click=${() => void copyText(packContent.llmsTxt)}
            >
              ${t("geo.repairPack.copyContent")}
            </button>
          </div>
          <pre class="geo-code-block__content geo-code-block__content--lines"><code>${packContent.llmsTxt || t("geo.skills.loading")}</code></pre>
        </section>
      </main>
      <aside class="geo-repair-pack__aside">
        <section class="geo-side-card">
          <h2 class="geo-side-card__title">${t("geo.repairPack.installTitle")}</h2>
          <ol class="geo-repair-pack__steps">
            <li>${t("geo.repairPack.stepJsonLd")}</li>
            <li>${t("geo.repairPack.stepLlms")}</li>
            <li>${t("geo.repairPack.stepFaq")}</li>
          </ol>
          <div class="geo-repair-pack__scan">${t("geo.repairPack.scanDecor")}</div>
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
  });
}
