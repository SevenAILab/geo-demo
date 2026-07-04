import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../i18n/index.ts";
import type { GeoReportIndustryAnalysis } from "../geo-report.ts";
import "../components/modal-dialog.ts";

type CustomCompetitor = {
  name: string;
  score: number;
};

function competitorInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
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

  @state() private modalOpen = false;
  @state() private draftName = "";
  @state() private draftScore = "";
  @state() private customCompetitor: CustomCompetitor | null = null;

  override createRenderRoot() {
    return this;
  }

  private openModal() {
    this.draftName = this.customCompetitor?.name ?? "";
    this.draftScore =
      this.customCompetitor != null ? String(this.customCompetitor.score) : "";
    this.modalOpen = true;
  }

  private closeModal() {
    this.modalOpen = false;
  }

  private saveCustomCompetitor() {
    const name = this.draftName.trim();
    const score = clampScore(this.draftScore);
    if (!name || score === null) {
      return;
    }
    this.customCompetitor = { name, score };
    this.closeModal();
  }

  private renderModal() {
    if (!this.modalOpen) {
      return nothing;
    }

    const title = t("geo.assessment.customCompetitorModalTitle");
    const description = t("geo.assessment.customCompetitorModalHint");
    const canSave = this.draftName.trim().length > 0 && clampScore(this.draftScore) !== null;

    return html`
      <openclaw-modal-dialog
        label=${title}
        description=${description}
        @modal-cancel=${this.closeModal}
      >
        <div class="exec-approval-card geo-assessment-v2__competitor-modal">
          <div class="exec-approval-header">
            <div>
              <div class="exec-approval-title">${title}</div>
              <div class="exec-approval-sub">${description}</div>
            </div>
          </div>
          <label class="geo-field geo-assessment-v2__competitor-field">
            <span class="geo-field__label">${t("geo.assessment.customCompetitorNameLabel")}</span>
            <input
              type="text"
              class="geo-field__input"
              .value=${this.draftName}
              placeholder=${t("geo.assessment.customCompetitorNamePlaceholder")}
              @input=${(event: Event) => {
                this.draftName = (event.target as HTMLInputElement).value;
              }}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  this.saveCustomCompetitor();
                }
              }}
            />
          </label>
          <label class="geo-field geo-assessment-v2__competitor-field">
            <span class="geo-field__label">${t("geo.assessment.customCompetitorScoreLabel")}</span>
            <input
              type="number"
              class="geo-field__input"
              min="0"
              max="100"
              step="0.1"
              .value=${this.draftScore}
              placeholder=${t("geo.assessment.customCompetitorScorePlaceholder")}
              @input=${(event: Event) => {
                this.draftScore = (event.target as HTMLInputElement).value;
              }}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  this.saveCustomCompetitor();
                }
              }}
            />
          </label>
          <div class="exec-approval-actions">
            <button
              type="button"
              class="btn primary"
              ?disabled=${!canSave}
              @click=${this.saveCustomCompetitor}
            >
              ${t("common.confirm")}
            </button>
            <button type="button" class="btn" @click=${this.closeModal}>
              ${t("common.cancel")}
            </button>
          </div>
        </div>
      </openclaw-modal-dialog>
    `;
  }

  override render() {
    const { industryAnalysis } = this;
    const customIndex = industryAnalysis.rankings.length + 1;

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
                  ? html`<span class="geo-assessment-v2__owned-tag">${t("geo.assessment.ownedTag")}</span>`
                  : nothing}
              </span>
              <span class="geo-assessment-v2__ranking-score">${item.score}%</span>
            </div>
          `,
        )}
        <button
          type="button"
          class="geo-assessment-v2__ranking-row geo-assessment-v2__ranking-row--custom"
          @click=${this.openModal}
        >
          <span class="geo-assessment-v2__ranking-asset">
            <span class="geo-assessment-v2__ranking-index">${customIndex}</span>
            ${this.customCompetitor
              ? html`
                  <span class="geo-assessment-v2__ranking-badge"
                    >${competitorInitial(this.customCompetitor.name)}</span
                  >
                  <span>${this.customCompetitor.name}</span>
                `
              : html`
                  <span class="geo-assessment-v2__ranking-custom"
                    >${t("geo.assessment.customCompetitor")}</span
                  >
                `}
          </span>
          <span class="geo-assessment-v2__ranking-score">
            ${this.customCompetitor
              ? html`${this.customCompetitor.score}%`
              : html`<span class="geo-assessment-v2__ranking-empty"></span>`}
          </span>
        </button>
      </div>
      ${this.renderModal()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "geo-assessment-ranking": GeoAssessmentRanking;
  }
}
