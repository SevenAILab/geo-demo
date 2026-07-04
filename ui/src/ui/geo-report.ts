export type GeoReportRating = "weak" | "moderate" | "strong";
export type GeoReportMetricId = "schema" | "entity" | "aiResponse";
export type GeoReportImpact = "high" | "medium" | "low";
export type GeoReportStatus = "idle" | "loading" | "ready" | "error";

export type GeoReportMetric = {
  id: GeoReportMetricId;
  label: string;
  value: number;
  statusLabel: string;
};

export type GeoReportGap = {
  id: string;
  title: string;
  impact: GeoReportImpact;
  description: string;
};

export type GeoVisibilityTrendPoint = {
  date: string;
  value: number;
};

export type GeoIndustryRanking = {
  id: string;
  initial: string;
  name: string;
  score: number;
  owned?: boolean;
};

export type GeoReportIndustryAnalysis = {
  currentVisibility: number;
  yourRanking: string;
  trend: GeoVisibilityTrendPoint[];
  rankings: GeoIndustryRanking[];
};

export type GeoReport = {
  totalScore: number;
  rating: GeoReportRating;
  summary: string;
  metrics: GeoReportMetric[];
  gaps: GeoReportGap[];
  industryAnalysis: GeoReportIndustryAnalysis;
};

export {
  extractGeoReportFromText,
  parseGeoReportJson,
  resolveGeoReportFromChat,
  syncGeoStateFromChat,
  type GeoSyncHost,
} from "./geo-parsers.ts";

import { syncGeoStateFromChat, type GeoSyncHost } from "./geo-parsers.ts";

export type GeoReportSyncHost = GeoSyncHost;

export function syncGeoReportFromChat(host: GeoReportSyncHost): void {
  syncGeoStateFromChat(host);
}

export function resetGeoReport(host: GeoReportSyncHost): void {
  host.geoReport = null;
  host.geoReportStatus = "idle";
}
