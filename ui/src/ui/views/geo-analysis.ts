import { html, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";

export type GeoAnalysisProps = {
  siteUrl: string;
  previewBlocked: boolean;
  chatSlot: TemplateResult;
  onBack: () => void;
  onExitToConsole: () => void;
  onPreviewBlocked: () => void;
};

export function renderGeoAnalysis(props: GeoAnalysisProps) {
  const previewUrl = props.previewBlocked ? null : props.siteUrl;

  return html`
    <div class="geo-analysis">
      <header class="geo-analysis__header">
        <div class="geo-analysis__brand">
          <span class="geo-analysis__logo">OpenBrand</span>
          <span class="geo-analysis__badge">${t("geo.analysis.reportBadge")}</span>
        </div>
        <div class="geo-analysis__header-actions">
          <button type="button" class="btn btn--sm" @click=${props.onBack}>
            ${t("geo.back")}
          </button>
          <button type="button" class="btn btn--sm" @click=${props.onExitToConsole}>
            ${t("geo.backToConsole")}
          </button>
          <button type="button" class="btn btn--sm" disabled>
            ${icons.download}
            ${t("geo.analysis.exportReport")}
          </button>
        </div>
      </header>

      <div class="geo-analysis__alert callout warn" role="status">
        <div class="geo-analysis__alert-body">
          <strong>${t("geo.analysis.alertTitle")}</strong>
          <p>${t("geo.analysis.alertBody")}</p>
        </div>
        <button type="button" class="btn btn--sm">${t("geo.analysis.viewReason")}</button>
      </div>

      <div class="geo-analysis__split">
        <section class="geo-preview">
          <div class="geo-preview__label">
            <span class="geo-preview__label-icon" aria-hidden="true">👁</span>
            ${t("geo.humanEye")}
          </div>
          <div class="geo-preview__frame">
            <div class="geo-preview__chrome">
              <span class="geo-preview__dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </span>
              <span class="geo-preview__address">${props.siteUrl}</span>
            </div>
            <div class="geo-preview__viewport">
              ${previewUrl
                ? html`
                    <iframe
                      class="geo-preview__iframe"
                      src=${previewUrl}
                      title=${t("geo.analysis.previewTitle", { url: props.siteUrl })}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                      loading="lazy"
                      @error=${props.onPreviewBlocked}
                    ></iframe>
                  `
                : html`
                    <div class="geo-preview__placeholder">
                      <div class="geo-preview__placeholder-hero">
                        <p class="geo-preview__placeholder-eyebrow">OpenBrand</p>
                        <h2>${t("geo.landing.heroTitle")}</h2>
                        <p>${t("geo.landing.heroSubtitle")}</p>
                        <span class="geo-preview__placeholder-cta">${t("geo.startExperience")}</span>
                      </div>
                      <p class="geo-preview__placeholder-note">${t("geo.analysis.previewFallback")}</p>
                    </div>
                  `}
            </div>
          </div>
        </section>

        <section class="geo-chat-pane">
          <div class="geo-chat-pane__label">
            <span class="geo-chat-pane__label-icon" aria-hidden="true">💬</span>
            ${t("geo.chatTitle")}
          </div>
          <div class="geo-chat-pane__body">${props.chatSlot}</div>
        </section>
      </div>
    </div>
  `;
}
