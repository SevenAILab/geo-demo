import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../i18n/index.ts";
import type { GeoReportIndustryAnalysis } from "../geo-report.ts";

function competitorInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "+";
  }
  return trimmed.charAt(0).toUpperCase();
}

function clampScore(raw: string): number | null {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

@customElement("geo-assessment-ranking")
export class GeoAssessmentRanking extends LitElement {
  @property({ attribute: false }) industryAnalysis!: GeoReportIndustryAnalysis;

  @state() private customName = "";
  @state() private customScore = "";

  override createRenderRoot() {
    return this;
  }

  override render() {
    const { industryAnalysis } = this;
    const customIndex = industryAnalysis.rankings.length + 1;
    const hasName = this.customName.trim().length > 0;

    return html`
      <h3 class="geo-assessment-v2__section-title">${t("geo.assessment.visibilityRanking")}</h3>
      <p class="geo-assessment-v2__your-ranking">${industryAnalysis.yourRanking}</p>
      <div class="geo-assessment-v2__ranking-table">
        <div class="geo-assessment-v2__ranking-head">
          <span>${t("geo.assessment.assetColumn")}</span>
          <span>${t("geo.assessment.scoreColumn")}</span>
        </div>
        ${industryAnalysis.rankings.map(
          (item, index) => html`
            <div class="geo-assessment-v2__ranking-row">
              <span class="geo-assessment-v2__ranking-asset">
                <span class="geo-assessment-v2__ranking-index">${index + 1}</span>
                <span class="geo-assessment-v2__ranking-badge">${item.initial}</span>
                <span>${item.name}</span>
                ${item.owned
                  ? html`<span class="geo-assessment-v2__owned-tag"
                      >${t("geo.assessment.ownedTag")}</span
                    >`
                  : nothing}
              </span>
              <span class="geo-assessment-v2__ranking-score">${item.score}%</span>
            </div>
          `,
        )}
        <div class="geo-assessment-v2__ranking-row geo-assessment-v2__ranking-row--custom">
          <span class="geo-assessment-v2__ranking-asset">
            <span class="geo-assessment-v2__ranking-index">${customIndex}</span>
            <span
              class="geo-assessment-v2__ranking-badge${hasName
                ? ""
                : " geo-assessment-v2__ranking-badge--empty"}"
              >${competitorInitial(this.customName)}</span
            >
            <input
              type="text"
              class="geo-assessment-v2__custom-input"
              .value=${this.customName}
              placeholder=${t("geo.assessment.customCompetitorNamePlaceholder")}
              @input=${(event: Event) => {
                this.customName = (event.target as HTMLInputElement).value;
              }}
            />
          </span>
          <span class="geo-assessment-v2__ranking-score geo-assessment-v2__ranking-score--input">
            <input
              type="number"
              class="geo-assessment-v2__custom-score-input"
              min="0"
              max="100"
              step="0.1"
              .value=${this.customScore}
              placeholder=${t("geo.assessment.customCompetitorScorePlaceholder")}
              @input=${(event: Event) => {
                const raw = (event.target as HTMLInputElement).value;
                const clamped = clampScore(raw);
                this.customScore = clamped !== null ? String(clamped) : raw;
              }}
            />
            <span class="geo-assessment-v2__custom-score-suffix">%</span>
          </span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "geo-assessment-ranking": GeoAssessmentRanking;
  }
}
