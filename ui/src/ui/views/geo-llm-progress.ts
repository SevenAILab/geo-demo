import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";

export type GeoLlmProgressProps = {
  active: boolean;
  title: string;
};

export function renderGeoLlmProgress(props: GeoLlmProgressProps) {
  if (!props.active) {
    return nothing;
  }

  const subtitle = t("geo.skills.loading");

  return html`
    <div
      class="geo-llm-progress-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="geo-llm-progress-title"
      aria-describedby="geo-llm-progress-subtitle"
    >
      <div class="geo-llm-progress-card">
        <h2 id="geo-llm-progress-title" class="geo-llm-progress-card__title">${props.title}</h2>
        <p id="geo-llm-progress-subtitle" class="geo-llm-progress-card__subtitle">${subtitle}</p>
        <div class="geo-llm-progress__bar" aria-hidden="true">
          <span class="geo-llm-progress__bar-indeterminate"></span>
        </div>
      </div>
    </div>
  `;
}
