import {
  applyGeoRunSnapshot,
  clearGeoActiveRun,
  createGeoRun,
  getGeoRunSnapshot,
  markGeoFlowActive,
  persistGeoRunSnapshot,
  refreshGeoHistory,
  type GeoHistoryHost,
  type GeoRunSnapshot,
  updateGeoRunFromHost,
} from "../geo-history.ts";
import { isGeoStepReady, resetGeoPhaseData, type GeoDataStatus } from "../geo-parsers.ts";
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
  GeoSessionHost &
  GeoHistoryHost & {
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

async function runInitialGeoAssessment(host: GeoHost): Promise<void> {
  try {
    await host.controlUiBootstrapReady?.catch(() => undefined);
    await runGeoSkill(host, "assessment");
  } catch (error) {
    console.warn("[geo] assessment failed:", error);
    host.geoReportStatus = "error";
    host.geoPendingSkill = null;
  } finally {
    updateGeoRunFromHost(host);
    host.requestUpdate?.();
  }
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
  resetGeoPhaseData(host);
  host.geoReportStatus = "loading";
  host.geoPendingSkill = "assessment";
  try {
    createGeoRun(host);
    void runInitialGeoAssessment(host);
    return true;
  } catch (error) {
    console.warn("[geo] failed to start assessment:", error);
    host.geoReportStatus = "error";
    host.geoPendingSkill = null;
    return false;
  } finally {
    host.geoStarting = false;
    host.requestUpdate?.();
  }
}

export function backToGeoLanding(host: GeoHost): void {
  updateGeoRunFromHost(host);
  host.geoPhase = "landing";
  host.geoStarting = false;
  resetGeoPhaseData(host);
  clearGeoActiveRun(host);
  markGeoFlowActive("landing");
  host.requestUpdate?.();
}

export type GeoOpenOptions = {
  force?: boolean;
};

export async function openGeoBrandStory(host: GeoHost, options?: GeoOpenOptions): Promise<void> {
  if (host.geoReportStatus !== "ready" || !host.geoReport) {
    return;
  }
  host.geoPhase = "brandStory";
  if (!options?.force && isGeoStepReady(host, "brandStory")) {
    restoreGeoSession(host, "brandStory");
    updateGeoRunFromHost(host);
    host.requestUpdate?.();
    return;
  }
  host.geoBrandStory = null;
  host.geoBrandStoryStatus = "loading";
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
  await runGeoSkill(host, "brandStory");
  updateGeoRunFromHost(host);
}

export async function openGeoOutputCenter(host: GeoHost, options?: GeoOpenOptions): Promise<void> {
  host.geoPhase = "outputCenter";
  if (!options?.force && isGeoStepReady(host, "content")) {
    restoreGeoSession(host, "content");
    updateGeoRunFromHost(host);
    host.requestUpdate?.();
    return;
  }
  host.geoOutputCenter = null;
  host.geoOutputStatus = "loading";
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
  await runGeoSkill(host, "content");
  updateGeoRunFromHost(host);
}

export async function openGeoRepairPack(host: GeoHost, options?: GeoOpenOptions): Promise<void> {
  host.geoPhase = "repairPack";
  if (!options?.force && isGeoStepReady(host, "fixpack")) {
    restoreGeoSession(host, "fixpack");
    updateGeoRunFromHost(host);
    host.requestUpdate?.();
    return;
  }
  host.geoRepairPack = null;
  host.geoRepairPackStatus = "loading";
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
  await runGeoSkill(host, "fixpack");
  updateGeoRunFromHost(host);
}

export async function openGeoMonitoringPanel(
  host: GeoHost,
  options?: GeoOpenOptions,
): Promise<void> {
  host.geoPhase = "monitoringPanel";
  if (!options?.force && isGeoStepReady(host, "monitoring")) {
    restoreGeoSession(host, "monitoring");
    updateGeoRunFromHost(host);
    host.requestUpdate?.();
    return;
  }
  host.geoMonitoring = null;
  host.geoMonitoringStatus = "loading";
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
  await runGeoSkill(host, "monitoring");
  updateGeoRunFromHost(host);
}

export async function reassessGeo(host: GeoHost): Promise<void> {
  resetGeoReport(host);
  host.geoReportStatus = "loading";
  host.geoPhase = "assessment";
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
  await runGeoSkill(host, "assessment");
  updateGeoRunFromHost(host);
}

export function backToGeoAssessment(host: GeoHost): void {
  host.geoPhase = "assessment";
  restoreGeoSession(host, "assessment");
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
}

export function backToGeoBrandStory(host: GeoHost): void {
  host.geoPhase = "brandStory";
  restoreGeoSession(host, "brandStory");
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
}

export function updateGeoBrandStoryValueProps(
  host: GeoHost,
  valueProps: string[],
  valuePropOther: string,
): void {
  if (!host.geoBrandStory) {
    return;
  }
  host.geoBrandStory = {
    ...host.geoBrandStory,
    valueProps,
    valuePropOther: valuePropOther.trim() || undefined,
  };
  host.requestUpdate?.();
}

export function saveGeoBrandStoryDraft(host: GeoHost): void {
  if (!host.geoBrandStory) {
    return;
  }
  updateGeoRunFromHost(host);
}

export function backToGeoOutputCenter(host: GeoHost): void {
  host.geoPhase = "outputCenter";
  restoreGeoSession(host, "content");
  updateGeoRunFromHost(host);
  host.requestUpdate?.();
}

export function restoreGeoSessionForPhase(host: GeoHost): void {
  const action = phaseToSkillAction(host.geoPhase);
  if (action) {
    restoreGeoSession(host, action);
  }
}

export async function restoreGeoRun(host: GeoHost & ChatState): Promise<boolean> {
  const runId = host.geoActiveRunId;
  if (!runId) {
    return false;
  }
  const snapshot = getGeoRunSnapshot(host, runId);
  if (!snapshot) {
    return false;
  }
  applyGeoRunSnapshot(host, snapshot);
  persistGeoRunSnapshot(host, snapshot);
  if (snapshot.phase !== "landing") {
    restoreGeoSessionForPhase(host);
    try {
      await loadChatHistory(host);
    } catch {
      // session may be gone — snapshot data still renders
    }
  }
  host.requestUpdate?.();
  return true;
}

export async function restoreGeoRunById(
  host: GeoHost & ChatState,
  runId: string,
): Promise<boolean> {
  host.geoActiveRunId = runId;
  return restoreGeoRun(host);
}

export { syncGeoReportFromChat, refreshGeoHistory, type GeoRunSnapshot };
