import { t } from "../../i18n/index.ts";
import { handleSendChat, type ChatHost } from "../app-chat.ts";
import { loadChatHistory } from "./chat.ts";

export type GeoPhase = "landing" | "analysis";

export type GeoHost = {
  geoPhase: GeoPhase;
  geoSiteUrl: string;
  geoStarting: boolean;
  geoBootstrappedUrl: string | null;
  requestUpdate?: () => void;
};

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

function buildGeoPrompt(url: string): string {
  return t("geo.analysis.initialPrompt", { url });
}

export async function startGeoExperience(host: GeoHost & ChatHost): Promise<boolean> {
  const url = normalizeGeoSiteUrl(host.geoSiteUrl);
  if (!url) {
    return false;
  }
  if (host.geoStarting) {
    return false;
  }
  host.geoSiteUrl = url;
  host.geoStarting = true;
  host.geoPhase = "analysis";
  host.requestUpdate?.();
  try {
    if (!host.connected || !host.client) {
      return true;
    }
    await loadChatHistory(host);
    if (host.geoBootstrappedUrl !== url) {
      host.geoBootstrappedUrl = url;
      await handleSendChat(host, buildGeoPrompt(url));
    }
    return true;
  } finally {
    host.geoStarting = false;
    host.requestUpdate?.();
  }
}

export function backToGeoLanding(host: GeoHost): void {
  host.geoPhase = "landing";
  host.geoStarting = false;
  host.requestUpdate?.();
}
