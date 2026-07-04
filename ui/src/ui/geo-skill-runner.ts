import { t } from "../i18n/index.ts";
import { handleSendChat, type ChatHost } from "./app-chat.ts";
import {
  createDemoGeoBrandStory,
  createDemoGeoMonitoring,
  createDemoGeoOutputCenter,
  createDemoGeoRepairPack,
  createDemoGeoReport,
} from "./geo-demo-data.ts";
import { scheduleGeoRunPersist, type GeoHistoryHost } from "./geo-history.ts";
import { fetchLiveGeoReport } from "./geo-live-score.ts";
import {
  type GeoBrandStory,
  type GeoSkillAction,
  type GeoSyncHost,
  resolveValuePropLabels,
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
  ChatHost &
  Partial<GeoHistoryHost> & {
    geoSiteUrl: string;
    geoSkillBusy: boolean;
    controlUiBootstrapReady?: Promise<void> | null;
    // 联调开关：assessment 是否走真实评分后端（默认走）；probe 需后端有 key（默认关）。
    geoLiveScore?: boolean;
    geoLiveProbe?: boolean;
    requestUpdate?: () => void;
  };

function maybePersistGeoRun(host: GeoSkillHost): void {
  if (host.geoActiveRunId) {
    scheduleGeoRunPersist(host as GeoHistoryHost);
  }
}

function jsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function brandStoryForPrompt(story: GeoBrandStory): Record<string, unknown> {
  return {
    brandName: story.brandName,
    industry: story.industry,
    valueProps: resolveValuePropLabels(story),
    audience: story.audience,
    differentiator: story.differentiator,
    competitors: story.competitors,
    aiPreview: story.aiPreview,
  };
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
  const brandJson = context.brandStory
    ? jsonBlock(brandStoryForPrompt(context.brandStory))
    : "（无）";

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

// 联调：assessment 阶段拉真实 scorecard；后端不可达/报错时置 error 态（视图提示启动后端）。
async function applyAssessmentResult(host: GeoSkillHost): Promise<void> {
  if (host.geoLiveScore === false) {
    host.geoReport = createDemoGeoReport(host.geoSiteUrl);
    host.geoReportStatus = "ready";
    return;
  }
  try {
    host.geoReport = await fetchLiveGeoReport(host.geoSiteUrl, {
      probe: host.geoLiveProbe === true,
      brand: host.geoBrandStory?.brandName,
    });
    host.geoReportStatus = "ready";
  } catch (error) {
    console.warn("[geo] live score unavailable:", error);
    host.geoReportStatus = "error";
  }
}

async function applyDevGeoSkillResult(host: GeoSkillHost, action: GeoSkillAction): Promise<void> {
  switch (action) {
    case "assessment":
      await applyAssessmentResult(host);
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
  // 未连网关：走本地结果（assessment → 实时评分后端，其余 → demo）。
  if (!host.connected || !host.client) {
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      await applyDevGeoSkillResult(host, action);
      return true;
    } finally {
      host.geoSkillBusy = false;
      host.requestUpdate?.();
    }
  }

  // 已连网关：走真实 chat 技能。
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
    maybePersistGeoRun(host);
    return true;
  } finally {
    host.geoSkillBusy = false;
    syncGeoStateFromChat(host);
    maybePersistGeoRun(host);
    host.requestUpdate?.();
  }
}

export { syncGeoStateFromChat };
