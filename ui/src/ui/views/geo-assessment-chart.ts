import { html, nothing, svg } from "lit";
import type { GeoVisibilityTrendPoint } from "../geo-report.ts";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const PADDING = { top: 10, right: 12, bottom: 28, left: 32 };
const AXIS_FILL = "#94a3b8";
const GRID_STROKE = "#e2e8f0";

function computeYDomain(values: number[]): { min: number; max: number } {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = dataMax - dataMin || 4;
  const pad = span * 0.08;
  return { min: dataMin - pad, max: dataMax + pad };
}

function buildNiceYTicks(min: number, max: number, count = 4): number[] {
  const range = max - min || 1;
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function formatTickLabel(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

function formatTrendDate(date: string): string {
  const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    return `${slashMatch[1]}月${slashMatch[2]}日`;
  }
  return date;
}

function formatXLabel(point: GeoVisibilityTrendPoint): string {
  return formatTrendDate(point.date);
}

function buildLinePath(
  points: GeoVisibilityTrendPoint[],
  minY: number,
  maxY: number,
  plotW: number,
  plotH: number,
): string {
  const range = maxY - minY || 1;
  return points
    .map((point, index) => {
      const x = PADDING.left + (index / Math.max(points.length - 1, 1)) * plotW;
      const y = PADDING.top + plotH - ((point.value - minY) / range) * plotH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function renderVisibilityTrendChart(
  points: GeoVisibilityTrendPoint[],
  currentVisibility?: number,
) {
  if (points.length === 0) {
    return nothing;
  }

  const plotW = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const values = points.map((p) => p.value);
  const { min: minY, max: maxY } = computeYDomain(values);
  const yRange = maxY - minY || 1;
  const yTicks = buildNiceYTicks(minY, maxY);
  const linePath = buildLinePath(points, minY, maxY, plotW, plotH);
  const headline = currentVisibility ?? points[points.length - 1]?.value ?? 0;

  return html`
    <div class="geo-assessment-v2__chart-wrap">
      <div class="geo-assessment-v2__chart-value">
        <strong>${headline.toFixed(1)}%</strong>
        <span class="geo-assessment-v2__chart-delta">-</span>
      </div>
      <svg
        class="geo-assessment-v2__chart-svg"
        viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}"
        preserveAspectRatio="xMinYMid meet"
        overflow="visible"
        aria-hidden="true"
      >
        ${svg`
          ${yTicks.map((tick) => {
            const y = PADDING.top + plotH - ((tick - minY) / yRange) * plotH;
            return svg`
              <line
                class="geo-assessment-v2__chart-grid"
                x1="${PADDING.left}"
                y1="${y}"
                x2="${CHART_WIDTH - PADDING.right}"
                y2="${y}"
                stroke="${GRID_STROKE}"
                stroke-width="1"
              />
              <text
                class="geo-assessment-v2__chart-label"
                x="0"
                y="${y}"
                text-anchor="start"
                dominant-baseline="middle"
                fill="${AXIS_FILL}"
              >
                ${formatTickLabel(tick)}
              </text>
            `;
          })}
          <path class="geo-assessment-v2__chart-line" d="${linePath}" />
          ${points.map((point, index) => {
            const x = PADDING.left + (index / Math.max(points.length - 1, 1)) * plotW;
            return svg`
              <text
                class="geo-assessment-v2__chart-label"
                x="${x}"
                y="${CHART_HEIGHT - 10}"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="${AXIS_FILL}"
              >
                ${formatXLabel(point)}
              </text>
            `;
          })}
        `}
      </svg>
    </div>
  `;
}
