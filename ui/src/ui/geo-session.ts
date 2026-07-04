import {
  createChatSessionsLoadOverrides,
  scopedAgentListParamsForSession,
  scopedAgentParamsForSession,
} from "./app-chat.ts";
import { switchChatSession } from "./app-render.helpers.ts";
import type { AppViewState } from "./app-view-state.ts";
import { loadChatHistory, type ChatState } from "./controllers/chat.ts";
import type { GeoPhase } from "./controllers/geo.ts";
import { createSessionAndRefresh } from "./controllers/sessions.ts";
import { saveGeoHistory } from "./geo-history-storage.ts";
import type { GeoSkillAction } from "./geo-parsers.ts";
import { resolveAgentIdFromSessionKey } from "./session-key.ts";

export type GeoSessionHost = AppViewState & {
  geoSessionKeys: Partial<Record<GeoSkillAction, string>>;
  requestUpdate?: () => void;
};

/**
 * Persist the current GEO session keys / site / phase to localStorage so the
 * demo can be resumed on re-entry. No-op unless the `geoPersistHistory` config
 * flag is enabled. Snapshots without any session key are dropped by the store.
 */
export function persistGeoHistory(host: GeoSessionHost): void {
  if (!host.geoPersistHistory) {
    return;
  }
  saveGeoHistory(host.settings.gatewayUrl, {
    siteUrl: host.geoSiteUrl,
    phase: host.geoPhase,
    sessionKeys: host.geoSessionKeys,
  });
}

function canBeginGeoSkillSession(host: GeoSessionHost): boolean {
  return (
    Boolean(host.client && host.connected) &&
    !host.sessionsLoading &&
    !host.chatLoading &&
    !host.chatSending &&
    !host.chatRunId &&
    host.chatStream === null &&
    host.chatQueue.length === 0
  );
}

export function phaseToSkillAction(phase: GeoPhase): GeoSkillAction | null {
  switch (phase) {
    case "assessment":
      return "assessment";
    case "brandStory":
      return "brandStory";
    case "outputCenter":
      return "content";
    case "repairPack":
      return "fixpack";
    case "monitoringPanel":
      return "monitoring";
    default:
      return null;
  }
}

export async function beginGeoSkillSession(
  host: GeoSessionHost,
  action: GeoSkillAction,
): Promise<string | null> {
  if (!canBeginGeoSkillSession(host)) {
    return null;
  }

  const previousSessionKey = host.sessionKey;
  const parentSessionKey = host.sessionsResult?.sessions.some(
    (row) => row.key === previousSessionKey,
  )
    ? previousSessionKey
    : undefined;

  const nextSessionKey = await createSessionAndRefresh(
    host as unknown as Parameters<typeof createSessionAndRefresh>[0],
    {
      agentId:
        scopedAgentParamsForSession(host, previousSessionKey).agentId ??
        resolveAgentIdFromSessionKey(previousSessionKey),
      parentSessionKey,
      emitCommandHooks: parentSessionKey !== undefined ? true : undefined,
    },
    {
      ...createChatSessionsLoadOverrides(host),
      ...scopedAgentListParamsForSession(host, previousSessionKey),
    },
  );

  if (!nextSessionKey || host.sessionKey !== previousSessionKey) {
    return null;
  }

  host.geoSessionKeys = { ...host.geoSessionKeys, [action]: nextSessionKey };
  persistGeoHistory(host);
  switchChatSession(host, nextSessionKey);
  await loadChatHistory(host as unknown as ChatState);
  host.requestUpdate?.();
  return nextSessionKey;
}

export function restoreGeoSession(host: GeoSessionHost, action: GeoSkillAction): void {
  const sessionKey = host.geoSessionKeys[action];
  if (!sessionKey || host.sessionKey === sessionKey) {
    return;
  }
  switchChatSession(host, sessionKey);
}
