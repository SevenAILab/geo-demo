import type { GatewayBrowserClient } from "./gateway.ts";
import type { GeoReport } from "./geo-report.ts";
import { buildAgentMainSessionKey, resolveAgentIdFromSessionKey } from "./session-key.ts";
import { generateUUID } from "./uuid.ts";

export const GEO_CORE_SUMMARY_MAX_CHARS = 50;
const GEO_CORE_SUMMARY_WAIT_MS = 45_000;

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

function fallbackSummaryText(fallback: string): string {
  return Array.from(fallback.replace(/\s+/g, " ").trim())
    .slice(0, GEO_CORE_SUMMARY_MAX_CHARS)
    .join("")
    .trim();
}

function extractJsonSummary(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { summary?: unknown; text?: unknown };
    const summary = parsed.summary ?? parsed.text;
    return typeof summary === "string" ? summary : null;
  } catch {
    return null;
  }
}

export function normalizeGeoCoreSummary(text: string, fallback = ""): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json|text|markdown|md)?\s*([\s\S]*?)\s*```$/i);
  const unfenced = fenced?.[1]?.trim() ?? trimmed;
  const jsonSummary = extractJsonSummary(unfenced);
  const source = jsonSummary ?? unfenced;
  const cleaned = source
    .replace(/^(?:核心总结|总结|核心优势分析)\s*[:：]\s*/i, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return fallbackSummaryText(cleaned || fallback);
}

export function buildGeoCoreSummaryPrompt(report: GeoReport, siteUrl: string): string {
  const metrics = report.metrics
    .map((metric) => `${metric.label}${metric.value}%：${metric.statusLabel}`)
    .join("；");
  const gaps = report.gaps
    .slice(0, 6)
    .map((gap) => `${gap.impact}：${gap.title}`)
    .join("；");
  return [
    "你是 OpenClaw GEO 分析助手。",
    "请基于以下页面分析结果，输出一段中文核心总结，50字以内。",
    "只输出总结正文，不要标题、列表、JSON 或解释。",
    `网址：${siteUrl}`,
    `总分：${report.totalScore}/100，等级：${report.rating}`,
    `当前摘要：${report.summary}`,
    `指标：${metrics || "无"}`,
    `优化项：${gaps || "无"}`,
  ].join("\n");
}

export function findLastAssistantText(messages: unknown[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object") {
      continue;
    }
    const role = (message as { role?: unknown }).role;
    if (typeof role !== "string" || role.toLowerCase() !== "assistant") {
      continue;
    }
    const text = extractMessageText(message);
    if (text?.trim()) {
      return text;
    }
  }
  return null;
}

function extractMessageText(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const entry = message as { content?: unknown; text?: unknown };
  if (typeof entry.text === "string") {
    return entry.text;
  }
  if (typeof entry.content === "string") {
    return entry.content;
  }
  if (!Array.isArray(entry.content)) {
    return null;
  }
  const parts = entry.content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return null;
      }
      const block = part as { type?: unknown; text?: unknown };
      return block.type === "text" && typeof block.text === "string" ? block.text : null;
    })
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return parts.length > 0 ? parts.join("\n") : null;
}

export async function requestGeoCoreSummary(params: {
  client: Pick<GatewayBrowserClient, "request">;
  currentSessionKey: string;
  siteUrl: string;
  report: GeoReport;
}): Promise<string | null> {
  const agentId = resolveAgentIdFromSessionKey(params.currentSessionKey);
  const sessionKey = buildAgentMainSessionKey({ agentId, mainKey: "geo-summary" });
  const accepted = await params.client.request<AgentAcceptedResult>("agent", {
    sessionKey,
    message: buildGeoCoreSummaryPrompt(params.report, params.siteUrl),
    deliver: false,
    idempotencyKey: `geo-summary-${generateUUID()}`,
    label: "GEO 核心总结",
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
    timeoutMs: GEO_CORE_SUMMARY_WAIT_MS,
  });
  if (wait.status !== "ok") {
    return null;
  }
  const history = await params.client.request<ChatHistoryResult>("chat.history", {
    sessionKey: resolvedSessionKey,
    limit: 20,
    maxChars: 8_000,
  });
  const messages = Array.isArray(history.messages) ? history.messages : [];
  const text = findLastAssistantText(messages);
  return text ? normalizeGeoCoreSummary(text, params.report.summary) : null;
}
