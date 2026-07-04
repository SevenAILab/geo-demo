import { t } from "../i18n/index.ts";
import { handleSendChat, type ChatHost } from "./app-chat.ts";
import {
  createDemoGeoBrandStory,
  createDemoGeoMonitoring,
  createDemoGeoOutputCenter,
  createDemoGeoRepairPack,
  createDemoGeoReport,
} from "./geo-demo-data.ts";
import {
  type GeoBrandStory,
  type GeoSkillAction,
  type GeoSyncHost,
  syncGeoStateFromChat,
} from "./geo-parsers.ts";
import type { GeoReport } from "./geo-report.ts";
import { beginGeoSkillSession } from "./geo-session.ts";

export const GEO_SKILL_PATHS: Record<GeoSkillAction, string> = {
  assessment: "skills/geo-assessment/SKILL.md",
  brandStory: "skills/geo-brand-story/SKILL.md",
  content: "skills/geo-content/SKILL.md",
  fixpack: "skills/geo-fixpack/SKILL.md",
  monitoring: "skills/geo-monitoring/SKILL.md",
};

export type GeoSkillHost = GeoSyncHost &
  ChatHost & {
    geoSiteUrl: string;
    geoSkillBusy: boolean;
    controlUiBootstrapReady?: Promise<void> | null;
    geoDevSkipSkillWait?: boolean;
    requestUpdate?: () => void;
  };

function jsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildGeoSkillPrompt(
  action: GeoSkillAction,
  context: {
    siteUrl: string;
    report?: GeoReport | null;
    brandStory?: GeoBrandStory | null;
  },
): string {
  const skillPath = GEO_SKILL_PATHS[action];
  const reportJson = context.report ? jsonBlock(context.report) : "（无）";
  const brandJson = context.brandStory ? jsonBlock(context.brandStory) : "（无）";

  switch (action) {
    case "assessment":
      return t("geo.skills.assessmentPrompt", { url: context.siteUrl, skillPath });
    case "brandStory":
      return t("geo.skills.brandStoryPrompt", {
        url: context.siteUrl,
        skillPath,
        reportJson,
      });
    case "content":
      return t("geo.skills.contentPrompt", {
        url: context.siteUrl,
        skillPath,
        reportJson,
        brandJson,
      });
    case "fixpack":
      return t("geo.skills.fixpackPrompt", {
        url: context.siteUrl,
        skillPath,
        reportJson,
        brandJson,
      });
    case "monitoring":
      return t("geo.skills.monitoringPrompt", {
        url: context.siteUrl,
        skillPath,
        reportJson,
        brandJson,
      });
  }
}

function applyDevGeoSkillResult(host: GeoSkillHost, action: GeoSkillAction): void {
  switch (action) {
    case "assessment":
      host.geoReport = createDemoGeoReport(host.geoSiteUrl);
      host.geoReportStatus = "ready";
      break;
    case "brandStory":
      host.geoBrandStory = createDemoGeoBrandStory(host.geoSiteUrl);
      host.geoBrandStoryStatus = "ready";
      break;
    case "content":
      host.geoOutputCenter = createDemoGeoOutputCenter();
      host.geoOutputStatus = "ready";
      break;
    case "fixpack":
      host.geoRepairPack = createDemoGeoRepairPack();
      host.geoRepairPackStatus = "ready";
      break;
    case "monitoring":
      host.geoMonitoring = createDemoGeoMonitoring();
      host.geoMonitoringStatus = "ready";
      break;
  }
  host.geoPendingSkill = null;
}

export async function runGeoSkill(host: GeoSkillHost, action: GeoSkillAction): Promise<boolean> {
  if (host.geoSkillBusy) {
    return false;
  }
  await host.controlUiBootstrapReady?.catch(() => undefined);
  if (host.geoDevSkipSkillWait === true) {
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      applyDevGeoSkillResult(host, action);
      return true;
    } finally {
      host.geoSkillBusy = false;
      host.requestUpdate?.();
    }
  }
  if (!host.connected || !host.client) {
    return false;
  }

  host.geoSkillBusy = true;
  host.geoPendingSkill = action;
  host.requestUpdate?.();

  try {
    const sessionKey = await beginGeoSkillSession(host as never, action);
    if (!sessionKey) {
      return false;
    }
    const prompt = buildGeoSkillPrompt(action, {
      siteUrl: host.geoSiteUrl,
      report: host.geoReport,
      brandStory: host.geoBrandStory,
    });
    await handleSendChat(host, prompt);
    syncGeoStateFromChat(host);
    return true;
  } finally {
    host.geoSkillBusy = false;
    syncGeoStateFromChat(host);
    host.requestUpdate?.();
  }
}

export { syncGeoStateFromChat };
