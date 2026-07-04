import { getSafeLocalStorage } from "../local-storage.ts";
import type { GeoPhase } from "./controllers/geo.ts";
import type { GeoSkillAction } from "./geo-parsers.ts";

const GEO_HISTORY_KEY_PREFIX = "openclaw.control.geo-history.v1:";

/**
 * Scope persisted history by gateway, matching the scheme used for scoped
 * session settings in `storage.ts` (protocol//host + trimmed path). Kept
 * self-contained so this module does not pull in the heavier `storage.ts`
 * dependency graph.
 */
function normalizeGatewayScope(gatewayUrl: string): string {
  const trimmed = typeof gatewayUrl === "string" ? gatewayUrl.trim() : "";
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

const GEO_PHASES: readonly GeoPhase[] = [
  "landing",
  "assessment",
  "brandStory",
  "outputCenter",
  "repairPack",
  "monitoringPanel",
];

const GEO_SKILL_ACTIONS: readonly GeoSkillAction[] = [
  "assessment",
  "brandStory",
  "content",
  "fixpack",
  "monitoring",
];

export type GeoHistorySnapshot = {
  siteUrl: string;
  phase: GeoPhase;
  sessionKeys: Partial<Record<GeoSkillAction, string>>;
};

function keyForGateway(gatewayUrl: string): string {
  return `${GEO_HISTORY_KEY_PREFIX}${normalizeGatewayScope(gatewayUrl)}`;
}

function normalizeSessionKeys(raw: unknown): Partial<Record<GeoSkillAction, string>> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const result: Partial<Record<GeoSkillAction, string>> = {};
  for (const action of GEO_SKILL_ACTIONS) {
    const value = source[action];
    if (typeof value === "string" && value.trim()) {
      result[action] = value;
    }
  }
  return result;
}

/** A snapshot only counts as resumable history when it has at least one session key. */
function hasSessionKeys(sessionKeys: Partial<Record<GeoSkillAction, string>>): boolean {
  return Object.keys(sessionKeys).length > 0;
}

export function loadGeoHistory(gatewayUrl: string): GeoHistorySnapshot | null {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(keyForGateway(gatewayUrl));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<GeoHistorySnapshot>;
    const siteUrl = typeof parsed.siteUrl === "string" ? parsed.siteUrl.trim() : "";
    if (!siteUrl) {
      return null;
    }
    const phase =
      typeof parsed.phase === "string" && GEO_PHASES.includes(parsed.phase as GeoPhase)
        ? (parsed.phase as GeoPhase)
        : "assessment";
    const sessionKeys = normalizeSessionKeys(parsed.sessionKeys);
    if (!hasSessionKeys(sessionKeys)) {
      return null;
    }
    return { siteUrl, phase, sessionKeys };
  } catch {
    return null;
  }
}

export function saveGeoHistory(gatewayUrl: string, snapshot: GeoHistorySnapshot): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  const siteUrl = snapshot.siteUrl.trim();
  const sessionKeys = normalizeSessionKeys(snapshot.sessionKeys);
  // Nothing meaningful to resume without a URL and at least one session key.
  if (!siteUrl || !hasSessionKeys(sessionKeys)) {
    clearGeoHistory(gatewayUrl);
    return;
  }
  const phase = GEO_PHASES.includes(snapshot.phase) ? snapshot.phase : "assessment";
  try {
    storage.setItem(
      keyForGateway(gatewayUrl),
      JSON.stringify({ siteUrl, phase, sessionKeys } satisfies GeoHistorySnapshot),
    );
  } catch {
    // best-effort — quota/security failures must not break the demo flow
  }
}

export function clearGeoHistory(gatewayUrl: string): void {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(keyForGateway(gatewayUrl));
  } catch {
    // best-effort
  }
}
