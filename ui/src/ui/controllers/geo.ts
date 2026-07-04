import { clearGeoHistory, loadGeoHistory } from "../geo-history-storage.ts";
import { resetGeoPhaseData, syncGeoStateFromChat, type GeoDataStatus } from "../geo-parsers.ts";
import {
  resetGeoReport,
  syncGeoReportFromChat,
  type GeoReport,
  type GeoReportStatus,
  type GeoReportSyncHost,
} from "../geo-report.ts";
import { phaseToSkillAction, restoreGeoSession, type GeoSessionHost } from "../geo-session.ts";
import { runGeoSkill, type GeoSkillHost } from "../geo-skill-runner.ts";
import { loadChatHistory, type ChatState } from "./chat.ts";

export type GeoPhase =
  | "landing"
  | "assessment"
  | "brandStory"
  | "outputCenter"
  | "repairPack"
  | "monitoringPanel";

export type GeoHost = GeoReportSyncHost &
  GeoSkillHost &
  GeoSessionHost & {
    geoPhase: GeoPhase;
    geoSiteUrl: string;
    geoStarting: boolean;
    requestUpdate?: () => void;
  };

export type { GeoReport, GeoReportStatus, GeoDataStatus };

export function normalizeGeoSiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function startGeoExperience(host: GeoHost): Promise<boolean> {
  const url = normalizeGeoSiteUrl(host.geoSiteUrl);
  if (!url) {
    return false;
  }
  if (host.geoStarting) {
    return false;
  }
  host.geoSiteUrl = url;
  host.geoStarting = true;
  host.geoPhase = "assessment";
  resetGeoReport(host);
  host.geoReportStatus = "loading";
  host.geoPendingSkill = "assessment";
  host.requestUpdate?.();
  try {
    await host.controlUiBootstrapReady?.catch(() => undefined);
    if (host.geoDevSkipSkillWait !== true && (!host.connected || !host.client)) {
      return true;
    }
    const ok = await runGeoSkill(host, "assessment");
    syncGeoReportFromChat(host);
    return ok;
  } finally {
    host.geoStarting = false;
    syncGeoReportFromChat(host);
    host.requestUpdate?.();
  }
}

export function backToGeoLanding(host: GeoHost): void {
  host.geoPhase = "landing";
  host.geoStarting = false;
  resetGeoPhaseData(host);
  // Returning to the landing page is an explicit "start over" — drop any
  // persisted history and the resume offer.
  clearGeoHistory(host.settings.gatewayUrl);
  host.geoResumeSnapshot = null;
  host.requestUpdate?.();
}

/**
 * On entering the GEO demo, surface a resume offer if a prior session was
 * persisted. No-op unless the `geoPersistHistory` config flag is enabled.
 * Does not navigate — the landing page decides how to present the offer.
 */
export function detectGeoResume(host: GeoHost): void {
  if (!host.geoPersistHistory || host.geoPhase !== "landing") {
    host.geoResumeSnapshot = null;
    return;
  }
  const snapshot = loadGeoHistory(host.settings.gatewayUrl);
  if (host.geoResumeSnapshot !== snapshot) {
    host.geoResumeSnapshot = snapshot;
    host.requestUpdate?.();
  }
}

/**
 * Resume the previously persisted GEO session: restore the site URL, session
 * keys, and phase, then load that phase's chat history from the server so its
 * panel data re-syncs (loadChatHistory triggers syncGeoStateFromChat).
 */
export async function resumeGeoExperience(host: GeoHost): Promise<boolean> {
  const snapshot = host.geoResumeSnapshot;
  if (!snapshot) {
    return false;
  }
  host.geoSiteUrl = snapshot.siteUrl;
  host.geoSessionKeys = { ...snapshot.sessionKeys };
  host.geoPhase = snapshot.phase;
  host.geoResumeSnapshot = null;
  host.requestUpdate?.();

  const action = phaseToSkillAction(snapshot.phase);
  if (action) {
    restoreGeoSession(host, action);
    await loadChatHistory(host as unknown as ChatState);
  }
  syncGeoStateFromChat(host);
  host.requestUpdate?.();
  return true;
}

export async function openGeoBrandStory(host: GeoHost): Promise<void> {
  if (host.geoReportStatus !== "ready" || !host.geoReport) {
    return;
  }
  host.geoPhase = "brandStory";
  host.geoBrandStory = null;
  host.geoBrandStoryStatus = "loading";
  host.requestUpdate?.();
  await runGeoSkill(host, "brandStory");
}

export async function openGeoOutputCenter(host: GeoHost): Promise<void> {
  host.geoPhase = "outputCenter";
  host.geoOutputCenter = null;
  host.geoOutputStatus = "loading";
  host.requestUpdate?.();
  await runGeoSkill(host, "content");
}

export async function openGeoRepairPack(host: GeoHost): Promise<void> {
  host.geoPhase = "repairPack";
  host.geoRepairPack = null;
  host.geoRepairPackStatus = "loading";
  host.requestUpdate?.();
  await runGeoSkill(host, "fixpack");
}

export async function openGeoMonitoringPanel(host: GeoHost): Promise<void> {
  host.geoPhase = "monitoringPanel";
  host.geoMonitoring = null;
  host.geoMonitoringStatus = "loading";
  host.requestUpdate?.();
  await runGeoSkill(host, "monitoring");
}

export async function reassessGeo(host: GeoHost): Promise<void> {
  resetGeoReport(host);
  host.geoReportStatus = "loading";
  host.geoPhase = "assessment";
  host.requestUpdate?.();
  await runGeoSkill(host, "assessment");
}

export function backToGeoAssessment(host: GeoHost): void {
  host.geoPhase = "assessment";
  restoreGeoSession(host, "assessment");
  host.requestUpdate?.();
}

export function backToGeoBrandStory(host: GeoHost): void {
  host.geoPhase = "brandStory";
  restoreGeoSession(host, "brandStory");
  host.requestUpdate?.();
}

export function backToGeoOutputCenter(host: GeoHost): void {
  host.geoPhase = "outputCenter";
  restoreGeoSession(host, "content");
  host.requestUpdate?.();
}

export function restoreGeoSessionForPhase(host: GeoHost): void {
  const action = phaseToSkillAction(host.geoPhase);
  if (action) {
    restoreGeoSession(host, action);
  }
}

export { syncGeoReportFromChat };
