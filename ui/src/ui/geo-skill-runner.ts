import { t } from "../i18n/index.ts";
import { handleSendChat, isChatBusy, type ChatHost } from "./app-chat.ts";
import { loadChatHistory, type ChatState } from "./controllers/chat.ts";
import { requestGeoBrandStory } from "./geo-brand-story.ts";
import {
  createDemoGeoBrandStory,
  createDemoGeoMonitoring,
  createDemoGeoOutputCenter,
  createDemoGeoRepairPack,
  createDemoGeoReport,
} from "./geo-demo-data.ts";
import { buildGeoRepairPack } from "./geo-fixpack.ts";
import { scheduleGeoRunPersist, type GeoHistoryHost } from "./geo-history.ts";
import { recordGeoIndustryVisibility } from "./geo-industry-history.ts";
import { fetchLiveGeoContent, fetchLiveGeoReport } from "./geo-live-score.ts";
import {
  type GeoBrandStory,
  type GeoDataStatus,
  type GeoOutputCenter,
  type GeoRepairPack,
  type GeoSkillAction,
  type GeoSyncHost,
  resolveValuePropLabels,
  syncGeoStateFromChat,
} from "./geo-parsers.ts";
import type { GeoReport } from "./geo-report.ts";
import { beginGeoSkillSession } from "./geo-session.ts";
import { requestGeoCoreSummary } from "./geo-summary.ts";

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
    geoDevSkipSkillWait?: boolean;
    geoPhase?: string;
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
    repairPack?: GeoRepairPack | null;
  },
): string {
  const skillPath = GEO_SKILL_PATHS[action];
  const reportJson = context.report ? jsonBlock(context.report) : "（无）";
  const brandJson = context.brandStory
    ? jsonBlock(brandStoryForPrompt(context.brandStory))
    : "（无）";
  const repairPackJson = context.repairPack ? jsonBlock(context.repairPack) : "（无）";

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
        repairPackJson,
      });
  }
}

// 联调：assessment 阶段拉真实 scorecard；后端不可达/报错时回退 demo。
async function applyAssessmentResult(host: GeoSkillHost): Promise<void> {
  if (host.geoLiveScore === false) {
    host.geoReport = recordGeoIndustryVisibility(
      host.geoSiteUrl,
      createDemoGeoReport(host.geoSiteUrl),
    );
    host.geoReportStatus = "ready";
    return;
  }
  try {
    const probe = host.geoLiveProbe === true;
    const report = await fetchLiveGeoReport(host.geoSiteUrl, {
      probe,
      brand: host.geoBrandStory?.brandName,
      // 未跑 probe 时，行业排名回退用真实竞品名（brandStory）而非占位标杆。
      competitors: host.geoBrandStory?.competitors,
      // 真实 probe 会串行调大模型，耗时更长；放宽超时并压低 runs 控制调用数/额度。
      runs: probe ? 1 : undefined,
      timeoutMs: probe ? 90_000 : 20_000,
    });
    host.geoReport = recordGeoIndustryVisibility(host.geoSiteUrl, report);
    host.geoReportStatus = "ready";
  } catch (error) {
    console.warn("[geo] live score unavailable:", error);
    host.geoReport = recordGeoIndustryVisibility(
      host.geoSiteUrl,
      createDemoGeoReport(host.geoSiteUrl),
    );
    host.geoReportStatus = "ready";
  }
}

// content（产出中心「四大修复大类」）改由确定性评分后端派生，不再走大模型。
// 与 assessment 同构：命中本地评分后端 /api/content；geoLiveScore=false 或后端不可达时回退 demo。
// 入参 = siteUrl(+品牌故事名，供后端点名品牌)；出参 = 解析后的 GeoOutputCenter。
async function resolveGeoOutputCenter(host: GeoSkillHost): Promise<GeoOutputCenter> {
  if (host.geoLiveScore === false) {
    return createDemoGeoOutputCenter(host.geoSiteUrl);
  }
  try {
    return await fetchLiveGeoContent(host.geoSiteUrl, {
      brand: host.geoBrandStory?.brandName,
    });
  } catch (error) {
    console.warn("[geo] live content unavailable:", error);
    return createDemoGeoOutputCenter(host.geoSiteUrl);
  }
}

async function refreshAssessmentCoreSummary(host: GeoSkillHost, report: GeoReport): Promise<void> {
  if (!host.connected || !host.client) {
    return;
  }
  try {
    const summary = await requestGeoCoreSummary({
      client: host.client,
      currentSessionKey: host.sessionKey,
      siteUrl: host.geoSiteUrl,
      report,
    });
    if (!summary || host.geoReport !== report) {
      return;
    }
    host.geoReport = { ...report, summary };
    maybePersistGeoRun(host);
    host.requestUpdate?.();
  } catch (error) {
    console.warn("[geo] openclaw summary unavailable:", error);
  }
}

function setGeoSkillStatus(
  host: GeoSkillHost,
  action: GeoSkillAction,
  status: GeoDataStatus,
): void {
  switch (action) {
    case "assessment":
      host.geoReportStatus = status;
      break;
    case "brandStory":
      host.geoBrandStoryStatus = status;
      break;
    case "content":
      host.geoOutputStatus = status;
      break;
    case "fixpack":
      host.geoRepairPackStatus = status;
      break;
    case "monitoring":
      host.geoMonitoringStatus = status;
      break;
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
    case "monitoring":
      host.geoMonitoring = createDemoGeoMonitoring();
      host.geoMonitoringStatus = "ready";
      break;
  }
  host.geoPendingSkill = null;
}

const GEO_SKILL_RUN_POLL_MS = 250;
const GEO_SKILL_RUN_TIMEOUT_MS = 180_000;

async function waitForSkillChatRun(host: GeoSkillHost, sessionKey: string): Promise<void> {
  const deadline = Date.now() + GEO_SKILL_RUN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (host.sessionKey !== sessionKey) {
      return;
    }
    if (!isChatBusy(host)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, GEO_SKILL_RUN_POLL_MS));
  }
}

export async function runGeoSkill(host: GeoSkillHost, action: GeoSkillAction): Promise<boolean> {
  if (host.geoSkillBusy) {
    return false;
  }
  await host.controlUiBootstrapReady?.catch(() => undefined);
  if (action === "assessment") {
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      await applyAssessmentResult(host);
      host.geoPendingSkill = null;
      maybePersistGeoRun(host);
      if (host.geoReport) {
        void refreshAssessmentCoreSummary(host, host.geoReport);
      }
      return true;
    } finally {
      host.geoSkillBusy = false;
      host.requestUpdate?.();
    }
  }
  // content 与 assessment 同为确定性后端派生（非大模型），故同样先于网关/dev 分支处理，
  // 无论是否连网关都命中本地评分后端 /api/content。
  if (action === "content") {
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      host.geoOutputCenter = await resolveGeoOutputCenter(host);
      host.geoOutputStatus = "ready";
      host.geoPendingSkill = null;
      maybePersistGeoRun(host);
      return true;
    } finally {
      host.geoSkillBusy = false;
      host.requestUpdate?.();
    }
  }
  // fixpack 是 brandStory 的确定性模板转换（Schema.org JSON-LD + llms.txt），
  // 纯代码生成、无需 agent/LLM/网络——最彻底的“不新增服务/进程”，且确定性天然满足
  // geo-fixpack “只描述可见事实、不编造数据” 红线。与 content 同为确定性派生，先于网关/dev 分支。
  if (action === "fixpack") {
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      host.geoRepairPack = host.geoBrandStory
        ? buildGeoRepairPack(host.geoBrandStory, host.geoSiteUrl)
        : createDemoGeoRepairPack();
      host.geoRepairPackStatus = "ready";
      host.geoPendingSkill = null;
      maybePersistGeoRun(host);
      return true;
    } finally {
      host.geoSkillBusy = false;
      host.requestUpdate?.();
    }
  }
  if (host.geoDevSkipSkillWait === true) {
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

  // 已连网关：brand-story 走后台专用 agent 调用（不新增服务/进程、不污染主聊天）。
  // 入参 = siteUrl + 体检报告（经 buildGeoSkillPrompt）；出参 = 解析后的 GeoBrandStory。
  if (action === "brandStory") {
    const client = host.client;
    if (!client) {
      setGeoSkillStatus(host, action, "error");
      return false;
    }
    host.geoSkillBusy = true;
    host.geoPendingSkill = action;
    host.requestUpdate?.();
    try {
      const prompt = buildGeoSkillPrompt("brandStory", {
        siteUrl: host.geoSiteUrl,
        report: host.geoReport,
      });
      const story = await requestGeoBrandStory({
        client,
        currentSessionKey: host.sessionKey,
        prompt,
        timeoutMs: 45_000,
      });
      if (story) {
        host.geoBrandStory = story;
        host.geoBrandStoryStatus = "ready";
      } else {
        setGeoSkillStatus(host, action, "error");
      }
      host.geoPendingSkill = null;
      maybePersistGeoRun(host);
      return Boolean(story);
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
      host.geoPendingSkill = null;
      setGeoSkillStatus(host, action, "error");
      return false;
    }
    const prompt = buildGeoSkillPrompt(action, {
      siteUrl: host.geoSiteUrl,
      report: host.geoReport,
      brandStory: host.geoBrandStory,
      repairPack: host.geoRepairPack,
    });
    await handleSendChat(host, prompt);
    await waitForSkillChatRun(host, sessionKey);
    if (host.sessionKey === sessionKey) {
      await loadChatHistory(host as unknown as ChatState);
    }
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
