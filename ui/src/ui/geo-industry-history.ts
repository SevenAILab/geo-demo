import { getSafeLocalStorage } from "../local-storage.ts";
import type { GeoReport, GeoVisibilityTrendPoint } from "./geo-report.ts";

const GEO_INDUSTRY_HISTORY_KEY = "openclaw.control.geo.industry-history.v1";
const MAX_SITES = 50;
const MAX_POINTS_PER_SITE = 30;

type GeoIndustryHistoryPoint = {
  ts: number;
  value: number;
};

type GeoIndustryHistorySite = {
  siteKey: string;
  label: string;
  updatedAt: number;
  points: GeoIndustryHistoryPoint[];
};

type GeoIndustryHistoryStore = {
  sites: GeoIndustryHistorySite[];
};

function normalizeSiteKey(siteUrl: string): string {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    return "unknown";
  }
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function loadStore(): GeoIndustryHistoryStore {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return { sites: [] };
  }
  try {
    const raw = storage.getItem(GEO_INDUSTRY_HISTORY_KEY);
    if (!raw) {
      return { sites: [] };
    }
    const parsed = JSON.parse(raw) as GeoIndustryHistoryStore;
    if (!parsed || !Array.isArray(parsed.sites)) {
      return { sites: [] };
    }
    return {
      sites: parsed.sites
        .filter((site) => site && typeof site.siteKey === "string" && Array.isArray(site.points))
        .map((site) => ({
          siteKey: site.siteKey,
          label: typeof site.label === "string" ? site.label : site.siteKey,
          updatedAt: typeof site.updatedAt === "number" ? site.updatedAt : 0,
          points: site.points
            .filter(
              (point) => point && typeof point.ts === "number" && typeof point.value === "number",
            )
            .map((point) => ({ ts: point.ts, value: clampScore(point.value) }))
            .slice(-MAX_POINTS_PER_SITE),
        })),
    };
  } catch {
    return { sites: [] };
  }
}

function saveStore(store: GeoIndustryHistoryStore): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(GEO_INDUSTRY_HISTORY_KEY, JSON.stringify(store));
  } catch {
    // Browser privacy/quota failures should not block the report.
  }
}

function formatTrendDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function toTrend(points: GeoIndustryHistoryPoint[]): GeoVisibilityTrendPoint[] {
  return points.map((point) => ({
    date: formatTrendDate(point.ts),
    value: point.value,
  }));
}

export function recordGeoIndustryVisibility(
  siteUrl: string,
  report: GeoReport,
  now = Date.now(),
): GeoReport {
  const siteKey = normalizeSiteKey(siteUrl);
  const value = clampScore(report.industryAnalysis.currentVisibility);
  const store = loadStore();
  const existing = store.sites.find((site) => site.siteKey === siteKey);
  const nextSite: GeoIndustryHistorySite = {
    siteKey,
    label: siteKey,
    updatedAt: now,
    points: [...(existing?.points ?? []), { ts: now, value }].slice(-MAX_POINTS_PER_SITE),
  };
  store.sites = [nextSite, ...store.sites.filter((site) => site.siteKey !== siteKey)]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SITES);
  saveStore(store);

  return {
    ...report,
    industryAnalysis: {
      ...report.industryAnalysis,
      currentVisibility: value,
      trend: toTrend(nextSite.points),
    },
  };
}
