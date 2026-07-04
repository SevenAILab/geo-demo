import { html, nothing, type TemplateResult } from "lit";
import { t } from "../../i18n/index.ts";
import { renderGeoLlmProgress, type GeoLlmProgressProps } from "./geo-llm-progress.ts";

export type GeoFlowLayoutProps = {
  siteUrl: string;
  chatOpen: boolean;
  chatSlot: TemplateResult;
  onToggleChat: () => void;
  header: TemplateResult;
  footer?: TemplateResult;
  children: TemplateResult;
  llmProgress?: GeoLlmProgressProps;
};

export function renderGeoFlowLayout(props: GeoFlowLayoutProps) {
  const bodyClass = props.chatOpen
    ? "geo-flow__body"
    : "geo-flow__body geo-flow__body--chat-collapsed";

  return html`
    <div class="geo-flow">
      ${props.header}
      <div class=${bodyClass}>
        <aside class="geo-flow__chat" aria-label=${t("geo.flow.chatTitle")}>
          <div class="geo-flow__chat-toolbar">
            <button
              type="button"
              class="btn btn--sm geo-flow__chat-toggle"
              @click=${props.onToggleChat}
              aria-expanded=${props.chatOpen}
              title=${props.chatOpen ? t("geo.flow.hideChat") : t("geo.flow.showChat")}
            >
              ${props.chatOpen ? "◀" : "▶"}
            </button>
            ${props.chatOpen
              ? html`
                  <div class="geo-chat-pane__label">
                    <span class="geo-chat-pane__label-icon" aria-hidden="true">💬</span>
                    ${t("geo.flow.chatTitle")}
                    <span class="geo-flow__site-url">${props.siteUrl}</span>
                  </div>
                `
              : nothing}
          </div>
          ${props.chatOpen
            ? html`<div class="geo-chat-pane__body geo-flow__chat-body">${props.chatSlot}</div>`
            : nothing}
        </aside>
        <main class="geo-flow__content">
          ${props.children}
          ${props.llmProgress ? renderGeoLlmProgress(props.llmProgress) : nothing}
        </main>
      </div>
      ${props.footer ?? nothing}
    </div>
  `;
}
