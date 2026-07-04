import { getSafeLocalStorage, getSafeSessionStorage } from "../local-storage.ts";
import type { GeoPhase } from "./controllers/geo.ts";
import type {
  GeoBrandStory,
  GeoDataStatus,
  GeoMonitoring,
  GeoOutputCenter,
  GeoRepairPack,
  GeoSkillAction,
} from "./geo-parsers.ts";
import type { GeoReport, GeoReportStatus } from "./geo-report.ts";
import { normalizeOptionalString } from "./string-coerce.ts";
import { generateUUID } from "./uuid.ts";

const GEO_HISTORY_KEY_PREFIX = "openclaw.control.geo.history.v1:";
const GEO_FLOW_ACTIVE_KEY = "openclaw.control.geo.flow-active";
const MAX_RUNS = 20;
const PERSIST_DEBOUNCE_MS = 300;

export type GeoRunSnapshot = {
  id: string;
  siteUrl: string;
  createdAt: number;
  updatedAt: number;
  phase: GeoPhase;
  sessionKeys: Partial<Record<GeoSkillAction, string>>;
  report: GeoReport | null;
  reportStatus: GeoReportStatus;
  brandStory: GeoBrandStory | null;
  brandStoryStatus: GeoDataStatus;
  outputCenter: GeoOutputCenter | null;
  outputStatus: GeoDataStatus;
  repairPack: GeoRepairPack | null;
  repairPackStatus: GeoDataStatus;
  monitoring: GeoMonitoring | null;
  monitoringStatus: GeoDataStatus;
  completedSteps: GeoSkillAction[];
};

export type GeoHistoryStore = {
  activeRunId?: string;
  runs: GeoRunSnapshot[];
};

export type GeoHistoryHost = {
  settings: { gatewayUrl: string };
  geoSiteUrl: string;
  geoPhase: GeoPhase;
  geoSessionKeys: Partial<Record<GeoSkillAction, string>>;
  geoReport: GeoReport | null;
  geoReportStatus: GeoReportStatus;
  geoBrandStory: GeoBrandStory | null;
  geoBrandStoryStatus: GeoDataStatus;
  geoOutputCenter: GeoOutputCenter | null;
  geoOutputStatus: GeoDataStatus;
  geoRepairPack: GeoRepairPack | null;
  geoRepairPackStatus: GeoDataStatus;
  geoMonitoring: GeoMonitoring | null;
  geoMonitoringStatus: GeoDataStatus;
  geoActiveRunId: string | null;
  geoHistoryRuns: GeoRunSnapshot[];
  geoResumeDismissed: boolean;
  requestUpdate?: () => void;
};

function normalizeGatewayScope(gatewayUrl: string): string {
  const trimmed = normalizeOptionalString(gatewayUrl) ?? "";
  if (!trimmed) {
    return "default";
  }
  try {
    const base =
      typeof location !== "undefined"
        ? `${location.protocol}//${location.host}${location.pathname || "/"}`
        : undefined;
    const parsed = base ? new URL(trimmed, base) : new URL(trimmed);
    const pathname =
      parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "") || parsed.pathname;
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return trimmed;
  }
}

function historyKeyForGateway(gatewayUrl: string): string {
  return `${GEO_HISTORY_KEY_PREFIX}${normalizeGatewayScope(gatewayUrl)}`;
}

function deriveCompletedSteps(host: GeoHistoryHost): GeoSkillAction[] {
  const steps: GeoSkillAction[] = [];
  if (host.geoReport && host.geoReportStatus === "ready") {
    steps.push("assessment");
  }
  if (host.geoBrandStory && host.geoBrandStoryStatus === "ready") {
    steps.push("brandStory");
  }
  if (host.geoOutputCenter && host.geoOutputStatus === "ready") {
    steps.push("content");
  }
  if (host.geoRepairPack && host.geoRepairPackStatus === "ready") {
    steps.push("fixpack");
  }
  if (host.geoMonitoring && host.geoMonitoringStatus === "ready") {
    steps.push("monitoring");
  }
  return steps;
}

function snapshotFromHost(host: GeoHistoryHost, existing?: GeoRunSnapshot): GeoRunSnapshot {
  const now = Date.now();
  return {
    id: existing?.id ?? host.geoActiveRunId ?? generateUUID(),
    siteUrl: host.geoSiteUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    phase: host.geoPhase,
    sessionKeys: { ...host.geoSessionKeys },
    report: host.geoReport,
    reportStatus: host.geoReportStatus,
    brandStory: host.geoBrandStory,
    brandStoryStatus: host.geoBrandStoryStatus,
    outputCenter: host.geoOutputCenter,
    outputStatus: host.geoOutputStatus,
    repairPack: host.geoRepairPack,
    repairPackStatus: host.geoRepairPackStatus,
    monitoring: host.geoMonitoring,
    monitoringStatus: host.geoMonitoringStatus,
    completedSteps: deriveCompletedSteps(host),
  };
}

function applySnapshotToHost(host: GeoHistoryHost, snapshot: GeoRunSnapshot): void {
  host.geoSiteUrl = snapshot.siteUrl;
  host.geoPhase = snapshot.phase;
  host.geoSessionKeys = { ...snapshot.sessionKeys };
  host.geoReport = snapshot.report;
  host.geoReportStatus = snapshot.reportStatus;
  host.geoBrandStory = snapshot.brandStory;
  host.geoBrandStoryStatus = snapshot.brandStoryStatus;
  host.geoOutputCenter = snapshot.outputCenter;
  host.geoOutputStatus = snapshot.outputStatus;
  host.geoRepairPack = snapshot.repairPack;
  host.geoRepairPackStatus = snapshot.repairPackStatus;
  host.geoMonitoring = snapshot.monitoring;
  host.geoMonitoringStatus = snapshot.monitoringStatus;
  host.geoActiveRunId = snapshot.id;
  host.geoResumeDismissed = false;
}

export function loadGeoHistoryStore(gatewayUrl: string): GeoHistoryStore {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return { runs: [] };
  }
  try {
    const raw = storage.getItem(historyKeyForGateway(gatewayUrl));
    if (!raw) {
      return { runs: [] };
    }
    const parsed = JSON.parse(raw) as GeoHistoryStore;
    if (!parsed || !Array.isArray(parsed.runs)) {
      return { runs: [] };
    }
    return {
      activeRunId: typeof parsed.activeRunId === "string" ? parsed.activeRunId : undefined,
      runs: parsed.runs.filter((run) => run && typeof run.id === "string"),
    };
  } catch {
    return { runs: [] };
  }
}

export function saveGeoHistoryStore(gatewayUrl: string, store: GeoHistoryStore): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(historyKeyForGateway(gatewayUrl), JSON.stringify(store));
  } catch {
    // privacy mode / quota — degrade silently
  }
}

function syncHostRunsFromStore(host: GeoHistoryHost, store: GeoHistoryStore): void {
  host.geoHistoryRuns = [...store.runs].sort((a, b) => b.updatedAt - a.updatedAt);
  host.geoActiveRunId = store.activeRunId ?? null;
}

function persistStore(host: GeoHistoryHost, store: GeoHistoryStore): void {
  saveGeoHistoryStore(host.settings.gatewayUrl, store);
  syncHostRunsFromStore(host, store);
}

export function refreshGeoHistory(host: GeoHistoryHost): void {
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  syncHostRunsFromStore(host, store);
}

export function createGeoRun(host: GeoHistoryHost): string {
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  const snapshot = snapshotFromHost(host);
  store.runs = [snapshot, ...store.runs.filter((run) => run.id !== snapshot.id)].slice(0, MAX_RUNS);
  store.activeRunId = snapshot.id;
  host.geoActiveRunId = snapshot.id;
  persistStore(host, store);
  markGeoFlowActive(host.geoPhase);
  host.requestUpdate?.();
  return snapshot.id;
}

let persistTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let pendingPersistHost: GeoHistoryHost | null = null;

export function scheduleGeoRunPersist(host: GeoHistoryHost): void {
  pendingPersistHost = host;
  if (persistTimer !== null) {
    globalThis.clearTimeout(persistTimer);
  }
  persistTimer = globalThis.setTimeout(() => {
    persistTimer = null;
    const target = pendingPersistHost;
    pendingPersistHost = null;
    if (target?.geoActiveRunId) {
      updateGeoRunFromHost(target);
    }
  }, PERSIST_DEBOUNCE_MS);
}

export function updateGeoRunFromHost(host: GeoHistoryHost): void {
  const runId = host.geoActiveRunId;
  if (!runId || host.geoPhase === "landing") {
    return;
  }
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  const index = store.runs.findIndex((run) => run.id === runId);
  const existing = index >= 0 ? store.runs[index] : undefined;
  const snapshot = snapshotFromHost(host, existing);
  if (index >= 0) {
    store.runs[index] = snapshot;
  } else {
    store.runs = [snapshot, ...store.runs].slice(0, MAX_RUNS);
  }
  store.activeRunId = runId;
  persistStore(host, store);
  markGeoFlowActive(host.geoPhase);
  host.requestUpdate?.();
}

export function clearGeoActiveRun(host: GeoHistoryHost): void {
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  delete store.activeRunId;
  saveGeoHistoryStore(host.settings.gatewayUrl, store);
  host.geoActiveRunId = null;
  clearGeoFlowActive();
}

export function isGeoRunIncomplete(run: GeoRunSnapshot): boolean {
  return run.phase !== "landing";
}

export function getLatestIncompleteRun(store: GeoHistoryStore): GeoRunSnapshot | null {
  if (!store.activeRunId) {
    return null;
  }
  const active = store.runs.find((run) => run.id === store.activeRunId);
  if (!active || !isGeoRunIncomplete(active)) {
    return null;
  }
  return active;
}

export function shouldShowGeoResumeBanner(host: GeoHistoryHost): GeoRunSnapshot | null {
  if (host.geoPhase !== "landing" || host.geoResumeDismissed) {
    return null;
  }
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  const incomplete = getLatestIncompleteRun(store);
  if (!incomplete) {
    return null;
  }
  if (isGeoFlowActive() || store.activeRunId === incomplete.id) {
    return incomplete;
  }
  return incomplete;
}

export function getGeoRunSnapshot(host: GeoHistoryHost, runId: string): GeoRunSnapshot | null {
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  return store.runs.find((run) => run.id === runId) ?? null;
}

export function dismissGeoResume(host: GeoHistoryHost): void {
  host.geoResumeDismissed = true;
  clearGeoActiveRun(host);
  host.requestUpdate?.();
}

export function applyGeoRunSnapshot(host: GeoHistoryHost, snapshot: GeoRunSnapshot): void {
  applySnapshotToHost(host, snapshot);
}

export function persistGeoRunSnapshot(host: GeoHistoryHost, snapshot: GeoRunSnapshot): void {
  const store = loadGeoHistoryStore(host.settings.gatewayUrl);
  const index = store.runs.findIndex((run) => run.id === snapshot.id);
  if (index >= 0) {
    store.runs[index] = snapshot;
  } else {
    store.runs = [snapshot, ...store.runs].slice(0, MAX_RUNS);
  }
  store.activeRunId = snapshot.id;
  persistStore(host, store);
  markGeoFlowActive(snapshot.phase);
}

export function markGeoFlowActive(phase: GeoPhase): void {
  const storage = getSafeSessionStorage();
  if (!storage) {
    return;
  }
  try {
    if (phase === "landing") {
      storage.removeItem(GEO_FLOW_ACTIVE_KEY);
    } else {
      storage.setItem(GEO_FLOW_ACTIVE_KEY, "1");
    }
  } catch {
    // ignore
  }
}

function clearGeoFlowActive(): void {
  const storage = getSafeSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(GEO_FLOW_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

function isGeoFlowActive(): boolean {
  const storage = getSafeSessionStorage();
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(GEO_FLOW_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function formatGeoRunSiteLabel(siteUrl: string): string {
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, "");
  } catch {
    return siteUrl;
  }
}

export function geoPhaseProgressLabel(phase: GeoPhase): string {
  switch (phase) {
    case "assessment":
      return "geo.history.progress.assessment";
    case "brandStory":
      return "geo.history.progress.brandStory";
    case "outputCenter":
      return "geo.history.progress.outputCenter";
    case "repairPack":
      return "geo.history.progress.repairPack";
    case "monitoringPanel":
      return "geo.history.progress.monitoringPanel";
    default:
      return "geo.history.progress.started";
  }
}
