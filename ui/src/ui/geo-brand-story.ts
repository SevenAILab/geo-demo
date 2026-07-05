import type { GatewayBrowserClient } from "./gateway.ts";
import { extractJsonFromText, type GeoBrandStory, parseGeoBrandStoryJson } from "./geo-parsers.ts";
import { findLastAssistantText } from "./geo-summary.ts";
import { buildAgentMainSessionKey, resolveAgentIdFromSessionKey } from "./session-key.ts";
import { generateUUID } from "./uuid.ts";

// geo-brand-story.ts — 「品牌故事」提炼的调用层。
// 不新增服务/进程：复用已有的 openclaw agent，走后台专用会话（deliver:false），
// 不污染用户可见的主聊天。与 geo-summary.ts 的 requestGeoCoreSummary 同构。
// 入参：siteUrl + 体检报告（已由调用方经 buildGeoSkillPrompt 拼成 prompt）。
// 出参：解析后的 GeoBrandStory（失败返回 null，调用方回退/置 error）。

// 品牌故事需读取站点内容并推理，比核心总结更重，放宽等待上限。
const GEO_BRAND_STORY_WAIT_MS = 180_000;

type AgentAcceptedResult = {
  runId?: unknown;
  sessionKey?: unknown;
};

type AgentWaitResult = {
  status?: unknown;
};

type ChatHistoryResult = {
  messages?: unknown;
};

export async function requestGeoBrandStory(params: {
  client: Pick<GatewayBrowserClient, "request">;
  currentSessionKey: string;
  prompt: string;
  timeoutMs?: number;
}): Promise<GeoBrandStory | null> {
  const agentId = resolveAgentIdFromSessionKey(params.currentSessionKey);
  const sessionKey = buildAgentMainSessionKey({ agentId, mainKey: "geo-brand-story" });
  const accepted = await params.client.request<AgentAcceptedResult>("agent", {
    sessionKey,
    message: params.prompt,
    deliver: false,
    idempotencyKey: `geo-brand-story-${generateUUID()}`,
    label: "GEO 品牌故事",
  });
  const runId = typeof accepted.runId === "string" ? accepted.runId : "";
  const resolvedSessionKey =
    typeof accepted.sessionKey === "string" && accepted.sessionKey.trim()
      ? accepted.sessionKey
      : sessionKey;
  if (!runId) {
    return null;
  }
  const wait = await params.client.request<AgentWaitResult>("agent.wait", {
    runId,
    timeoutMs: params.timeoutMs ?? GEO_BRAND_STORY_WAIT_MS,
  });
  if (wait.status !== "ok") {
    return null;
  }
  const history = await params.client.request<ChatHistoryResult>("chat.history", {
    sessionKey: resolvedSessionKey,
    limit: 20,
    maxChars: 16_000,
  });
  const messages = Array.isArray(history.messages) ? history.messages : [];
  const text = findLastAssistantText(messages);
  if (!text) {
    return null;
  }
  return parseGeoBrandStoryJson(extractJsonFromText(text));
}
