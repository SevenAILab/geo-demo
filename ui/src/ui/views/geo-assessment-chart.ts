import { html, nothing } from "lit";
import type { GeoVisibilityTrendPoint } from "../geo-report.ts";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 160;
const PADDING = { top: 12, right: 12, bottom: 28, left: 36 };

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
  const minY = Math.floor(Math.min(...values) - 2);
  const maxY = Math.ceil(Math.max(...values) + 2);
  const linePath = buildLinePath(points, minY, maxY, plotW, plotH);
  const headline = currentVisibility ?? points[points.length - 1]?.value ?? 0;
  const yTicks = [minY, (minY + maxY) / 2, maxY];

  return html`
    <div class="geo-assessment-v2__chart-wrap">
      <div class="geo-assessment-v2__chart-value">
        <strong>${headline.toFixed(1)}%</strong>
        <span class="geo-assessment-v2__chart-delta">-</span>
      </div>
      <svg
        class="geo-assessment-v2__chart-svg"
        viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}"
        aria-hidden="true"
      >
        ${yTicks.map((tick) => {
          const y = PADDING.top + plotH - ((tick - minY) / (maxY - minY || 1)) * plotH;
          return html`
            <line
              class="geo-assessment-v2__chart-grid"
              x1=${PADDING.left}
              y1=${y}
              x2=${CHART_WIDTH - PADDING.right}
              y2=${y}
            />
            <text
              class="geo-assessment-v2__chart-axis"
              x=${PADDING.left - 6}
              y=${y + 4}
              text-anchor="end"
            >
              ${tick.toFixed(1)}%
            </text>
          `;
        })}
        <path class="geo-assessment-v2__chart-line" d=${linePath} />
        ${points.map((point, index) => {
          const x = PADDING.left + (index / Math.max(points.length - 1, 1)) * plotW;
          const y = PADDING.top + plotH - ((point.value - minY) / (maxY - minY || 1)) * plotH;
          return html`
            <circle class="geo-assessment-v2__chart-dot" cx=${x} cy=${y} r="3.5" />
            <text
              class="geo-assessment-v2__chart-date"
              x=${x}
              y=${CHART_HEIGHT - 6}
              text-anchor="middle"
            >
              ${point.date}
            </text>
          `;
        })}
      </svg>
    </div>
  `;
}
