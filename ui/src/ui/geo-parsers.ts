import { extractText } from "./chat/message-extract.ts";
import type {
  GeoIndustryRanking,
  GeoReport,
  GeoReportGap,
  GeoReportIndustryAnalysis,
  GeoReportMetric,
  GeoReportRating,
  GeoVisibilityTrendPoint,
} from "./geo-report.ts";

export type GeoDataStatus = "idle" | "loading" | "ready" | "error";

export type GeoSkillAction = "assessment" | "brandStory" | "content" | "fixpack" | "monitoring";

export const GEO_VALUE_PROP_OTHER_ID = "__other__";

export type GeoValuePropOption = {
  id: string;
  label: string;
  suggested?: boolean;
};

export type GeoBrandStory = {
  brandName: string;
  industry: string;
  valuePropOptions: GeoValuePropOption[];
  valueProps: string[];
  valuePropOther?: string;
  audience: string;
  differentiator: string;
  competitors: string[];
  aiPreview: { entity: string; type: string; audience: string };
};

export type GeoOutputRepairTag =
  | "techInfra"
  | "brandContent"
  | "structure"
  | "continuousArticle";

export type GeoOutputCategory = {
  id: string;
  title: string;
  description: string;
  impact: GeoReportGap["impact"];
  tags: GeoOutputRepairTag[];
};

export type GeoOutputCenter = {
  categories: GeoOutputCategory[];
};

export type GeoRepairPack = {
  jsonLd: string;
  llmsTxt: string;
};

export type GeoDimensionTone = "good" | "purple" | "warn";

export type GeoDimension = {
  id: string;
  label: string;
  value: number;
  tone: GeoDimensionTone;
};

export type GeoTopicCard = {
  id: string;
  title: string;
  tag: "missing" | "insight";
  action: "comparison" | "deep";
};

export type GeoRecentPublish = {
  title: string;
  ago: string;
};

export type GeoMonitoring = {
  readinessScore: number;
  readinessDelta: string;
  dimensions: GeoDimension[];
  topics: GeoTopicCard[];
  recentPublishes: GeoRecentPublish[];
  articlePreview: string;
};

const JSON_BLOCK_RE = /```(?:json)?\s*([\s\S]*?)```/gi;
const METRIC_IDS = new Set(["schema", "entity", "aiResponse"]);
const RATINGS = new Set<GeoReportRating>(["weak", "moderate", "strong"]);
const IMPACTS = new Set(["high", "medium", "low"]);
const REPAIR_TAGS = new Set<GeoOutputRepairTag>([
  "techInfra",
  "brandContent",
  "structure",
  "continuousArticle",
]);
const DIMENSION_TONES = new Set<GeoDimensionTone>(["good", "purple", "warn"]);
const TOPIC_TAGS = new Set<GeoTopicCard["tag"]>(["missing", "insight"]);
const TOPIC_ACTIONS = new Set<GeoTopicCard["action"]>(["comparison", "deep"]);

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractBalancedJsonObject(textContent: string): unknown | null {
  const start = textContent.indexOf("{");
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < textContent.length; index += 1) {
    const char = textContent[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(textContent.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function extractJsonFromText(textContent: string): unknown | null {
  const trimmed = textContent.trim();
  if (!trimmed) {
    return null;
  }
  const blocks = [...trimmed.matchAll(JSON_BLOCK_RE)];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]?.[1]?.trim();
    if (!block) {
      continue;
    }
    try {
      return JSON.parse(block);
    } catch {
      const balanced = extractBalancedJsonObject(block);
      if (balanced !== null) {
        return balanced;
      }
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      const balanced = extractBalancedJsonObject(trimmed);
      if (balanced !== null) {
        return balanced;
      }
    }
  }
  return null;
}

function parseMetric(raw: unknown): GeoReportMetric | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = item.id;
  if (typeof id !== "string" || !METRIC_IDS.has(id)) {
    return null;
  }
  const label = text(item.label);
  const statusLabel = text(item.statusLabel);
  const value = clampScore(item.value);
  if (!label || !statusLabel || value === null) {
    return null;
  }
  return { id: id as GeoReportMetric["id"], label, value, statusLabel };
}

function parseGap(raw: unknown): GeoReportGap | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const title = text(item.title);
  const description = text(item.description);
  const impact = item.impact;
  if (!id || !title || !description || typeof impact !== "string" || !IMPACTS.has(impact)) {
    return null;
  }
  return { id, title, description, impact: impact as GeoReportGap["impact"] };
}

function parseTrendPoint(raw: unknown): GeoVisibilityTrendPoint | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const date = text(item.date);
  const value = clampScore(item.value);
  if (!date || value === null) {
    return null;
  }
  return { date, value };
}

function parseRanking(raw: unknown): GeoIndustryRanking | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const initial = text(item.initial);
  const name = text(item.name);
  const score = clampScore(item.score);
  if (!id || !initial || !name || score === null) {
    return null;
  }
  return {
    id,
    initial,
    name,
    score,
    owned: item.owned === true ? true : undefined,
  };
}

function parseIndustryAnalysis(raw: unknown): GeoReportIndustryAnalysis | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const currentVisibility = clampScore(item.currentVisibility);
  const yourRanking = text(item.yourRanking);
  if (currentVisibility === null || !yourRanking) {
    return null;
  }
  if (!Array.isArray(item.trend) || !Array.isArray(item.rankings)) {
    return null;
  }
  const trend = item.trend
    .map(parseTrendPoint)
    .filter((point): point is GeoVisibilityTrendPoint => point !== null);
  const rankings = item.rankings
    .map(parseRanking)
    .filter((entry): entry is GeoIndustryRanking => entry !== null);
  if (trend.length < 3 || rankings.length < 3) {
    return null;
  }
  const ownedCount = rankings.filter((entry) => entry.owned).length;
  if (ownedCount !== 1) {
    return null;
  }
  return { currentVisibility, yourRanking, trend, rankings };
}

export function parseGeoReportJson(raw: unknown): GeoReport | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const totalScore = clampScore(item.totalScore);
  const rating = item.rating;
  const summary = text(item.summary);
  if (
    totalScore === null ||
    typeof rating !== "string" ||
    !RATINGS.has(rating as GeoReportRating) ||
    !summary
  ) {
    return null;
  }
  if (!Array.isArray(item.metrics) || !Array.isArray(item.gaps)) {
    return null;
  }
  const metrics = item.metrics
    .map(parseMetric)
    .filter((value): value is GeoReportMetric => value !== null);
  const gaps = item.gaps.map(parseGap).filter((value): value is GeoReportGap => value !== null);
  if (metrics.length === 0 || gaps.length === 0) {
    return null;
  }
  const industryAnalysis = parseIndustryAnalysis(item.industryAnalysis);
  if (!industryAnalysis) {
    return null;
  }
  return {
    totalScore,
    rating: rating as GeoReportRating,
    summary,
    metrics,
    gaps,
    industryAnalysis,
  };
}

function parseValuePropOption(raw: unknown): GeoValuePropOption | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const label = text(item.label);
  if (!id || !label) {
    return null;
  }
  return {
    id,
    label,
    suggested: item.suggested === true ? true : undefined,
  };
}

function parseValuePropOptions(raw: unknown): GeoValuePropOption[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(parseValuePropOption)
    .filter((option): option is GeoValuePropOption => option !== null);
}

function parseValueProps(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
}

export function resolveValuePropLabels(story: GeoBrandStory): string[] {
  const labels: string[] = [];
  for (const id of story.valueProps) {
    if (id === GEO_VALUE_PROP_OTHER_ID) {
      const other = text(story.valuePropOther);
      if (other) {
        labels.push(other);
      }
      continue;
    }
    const option = story.valuePropOptions.find((entry) => entry.id === id);
    labels.push(option?.label ?? id);
  }
  return labels;
}

function deriveBrandNameFromSiteUrl(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? "OpenBrand";
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "OpenBrand";
  }
}

export function enrichGeoBrandStory(
  story: GeoBrandStory,
  siteUrl?: string,
): GeoBrandStory {
  const trimmedUrl = siteUrl?.trim();
  if (story.brandName.trim() || !trimmedUrl) {
    return story;
  }
  const fallbackName = deriveBrandNameFromSiteUrl(trimmedUrl);
  return {
    ...story,
    brandName: fallbackName,
    aiPreview: {
      ...story.aiPreview,
      entity: story.aiPreview.entity.trim() || fallbackName,
    },
  };
}

export function parseGeoBrandStoryJson(raw: unknown): GeoBrandStory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = normalizeBrandStoryRaw(raw as Record<string, unknown>);
  const brandName = text(item.brandName);
  const industry = text(item.industry);
  const valuePropOptions = parseValuePropOptions(item.valuePropOptions);
  const valueProps = parseValueProps(item.valueProps);
  const valuePropOther = text(item.valuePropOther) || undefined;
  const audience = text(item.audience);
  const differentiator = text(item.differentiator);
  const competitors = Array.isArray(item.competitors)
    ? item.competitors.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
    : [];
  const previewRaw = item.aiPreview;
  const p =
    previewRaw && typeof previewRaw === "object" ? (previewRaw as Record<string, unknown>) : {};
  const entity = text(p.entity) || brandName;
  const type = text(p.type) || industry;
  const previewAudience = text(p.audience) || audience;
  return {
    brandName,
    industry,
    valuePropOptions,
    valueProps,
    valuePropOther,
    audience,
    differentiator,
    competitors,
    aiPreview: { entity, type, audience: previewAudience },
  };
}

const BRAND_STORY_FIELD_ALIASES: Record<string, string> = {
  brand_name: "brandName",
  brand: "brandName",
  target_audience: "audience",
  targetAudience: "audience",
  differentiators: "differentiator",
  ai_preview: "aiPreview",
  value_propositions: "valuePropOptions",
  valuePropositions: "valuePropOptions",
  competitor_urls: "competitors",
  competitorUrls: "competitors",
};

function normalizeValuePropOptionsRaw(raw: unknown): unknown {
  if (!Array.isArray(raw) || raw.length === 0) {
    return raw;
  }
  if (typeof raw[0] === "string") {
    return raw.map((label, index) => ({
      id: `vp-${index + 1}`,
      label,
      suggested: index === 0,
    }));
  }
  return raw;
}

function normalizeBrandStoryRaw(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const target = BRAND_STORY_FIELD_ALIASES[key] ?? key;
    const nextValue = target === "valuePropOptions" ? normalizeValuePropOptionsRaw(value) : value;
    if (target === "aiPreview" && nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)) {
      const existing =
        normalized.aiPreview &&
        typeof normalized.aiPreview === "object" &&
        !Array.isArray(normalized.aiPreview)
          ? (normalized.aiPreview as Record<string, unknown>)
          : {};
      normalized.aiPreview = { ...existing, ...(nextValue as Record<string, unknown>) };
      continue;
    }
    if (!(target in normalized)) {
      normalized[target] = nextValue;
    }
  }
  return normalized;
}

export function isGeoBrandStoryComplete(story: GeoBrandStory | null): boolean {
  if (!story || !story.differentiator) {
    return false;
  }
  if (story.valueProps.length === 0) {
    return false;
  }
  if (story.valueProps.includes(GEO_VALUE_PROP_OTHER_ID)) {
    return Boolean(text(story.valuePropOther));
  }
  return true;
}

function parseRepairTags(raw: unknown): GeoOutputRepairTag[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const tags: GeoOutputRepairTag[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !REPAIR_TAGS.has(entry as GeoOutputRepairTag)) {
      return null;
    }
    const tag = entry as GeoOutputRepairTag;
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  if (tags.length < 1 || tags.length > 4) {
    return null;
  }
  return tags;
}

function parseOutputCategory(raw: unknown): GeoOutputCategory | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const title = text(item.title);
  const description = text(item.description);
  const impact = item.impact;
  const tags = parseRepairTags(item.tags);
  if (
    !id ||
    !title ||
    !description ||
    typeof impact !== "string" ||
    !IMPACTS.has(impact) ||
    !tags
  ) {
    return null;
  }
  return {
    id,
    title,
    description,
    impact: impact as GeoOutputCategory["impact"],
    tags,
  };
}

export function parseGeoOutputCenterJson(raw: unknown): GeoOutputCenter | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  if (!Array.isArray(item.categories)) {
    return null;
  }
  const categories = item.categories
    .map(parseOutputCategory)
    .filter((category): category is GeoOutputCategory => category !== null);
  if (categories.length !== 4) {
    return null;
  }
  return { categories };
}

export function parseGeoRepairPackJson(raw: unknown): GeoRepairPack | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const jsonLd = text(item.jsonLd);
  const llmsTxt = text(item.llmsTxt);
  if (!jsonLd || !llmsTxt) {
    return null;
  }
  try {
    JSON.parse(jsonLd);
  } catch {
    return null;
  }
  return { jsonLd, llmsTxt };
}

function parseDimension(raw: unknown): GeoDimension | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const label = text(item.label);
  const value = clampScore(item.value);
  const tone = item.tone;
  if (
    !id ||
    !label ||
    value === null ||
    typeof tone !== "string" ||
    !DIMENSION_TONES.has(tone as GeoDimensionTone)
  ) {
    return null;
  }
  return { id, label, value, tone: tone as GeoDimensionTone };
}

function parseTopic(raw: unknown): GeoTopicCard | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const title = text(item.title);
  const tag = item.tag;
  const action = item.action;
  if (!id || !title || typeof tag !== "string" || !TOPIC_TAGS.has(tag as GeoTopicCard["tag"])) {
    return null;
  }
  if (typeof action !== "string" || !TOPIC_ACTIONS.has(action as GeoTopicCard["action"])) {
    return null;
  }
  return { id, title, tag: tag as GeoTopicCard["tag"], action: action as GeoTopicCard["action"] };
}

function parseRecentPublish(raw: unknown): GeoRecentPublish | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const title = text(item.title);
  const ago = text(item.ago);
  if (!title || !ago) {
    return null;
  }
  return { title, ago };
}

export function parseGeoMonitoringJson(raw: unknown): GeoMonitoring | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const readinessScore = clampScore(item.readinessScore);
  const readinessDelta = text(item.readinessDelta);
  const articlePreview = text(item.articlePreview);
  if (readinessScore === null || !readinessDelta || !articlePreview) {
    return null;
  }
  if (
    !Array.isArray(item.dimensions) ||
    !Array.isArray(item.topics) ||
    !Array.isArray(item.recentPublishes)
  ) {
    return null;
  }
  const dimensions = item.dimensions
    .map(parseDimension)
    .filter((d): d is GeoDimension => d !== null);
  const topics = item.topics.map(parseTopic).filter((t): t is GeoTopicCard => t !== null);
  const recentPublishes = item.recentPublishes
    .map(parseRecentPublish)
    .filter((r): r is GeoRecentPublish => r !== null);
  if (dimensions.length === 0 || topics.length === 0) {
    return null;
  }
  return {
    readinessScore,
    readinessDelta,
    dimensions,
    topics,
    recentPublishes,
    articlePreview,
  };
}

function isAssistantMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") {
    return false;
  }
  return (message as Record<string, unknown>).role === "assistant";
}

function collectAssistantTexts(messages: unknown[], stream: string | null): string[] {
  const texts: string[] = [];
  for (const message of messages) {
    if (!isAssistantMessage(message)) {
      continue;
    }
    const extracted = extractText(message);
    if (extracted?.trim()) {
      texts.push(extracted);
    }
  }
  if (stream?.trim()) {
    texts.push(stream);
  }
  return texts;
}

export function resolveParsedFromChat<T>(
  messages: unknown[],
  stream: string | null,
  parser: (raw: unknown) => T | null,
): T | null {
  const texts = collectAssistantTexts(messages, stream);
  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const raw = extractJsonFromText(texts[index] ?? "");
    if (raw === null) {
      continue;
    }
    const parsed = parser(raw);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

export function extractGeoReportFromText(textContent: string): GeoReport | null {
  const raw = extractJsonFromText(textContent);
  return raw === null ? null : parseGeoReportJson(raw);
}

export function resolveGeoReportFromChat(
  messages: unknown[],
  stream: string | null,
): GeoReport | null {
  return resolveParsedFromChat(messages, stream, parseGeoReportJson);
}

export type GeoSyncHost = {
  geoPendingSkill: GeoSkillAction | null;
  geoPhase?: string;
  geoStarting: boolean;
  geoSkillBusy?: boolean;
  geoSiteUrl?: string;
  geoSessionKeys: Partial<Record<GeoSkillAction, string>>;
  sessionKey?: string;
  geoReport: GeoReport | null;
  geoReportStatus: GeoDataStatus;
  geoBrandStory: GeoBrandStory | null;
  geoBrandStoryStatus: GeoDataStatus;
  geoOutputCenter: GeoOutputCenter | null;
  geoOutputStatus: GeoDataStatus;
  geoRepairPack: GeoRepairPack | null;
  geoRepairPackStatus: GeoDataStatus;
  geoMonitoring: GeoMonitoring | null;
  geoMonitoringStatus: GeoDataStatus;
  chatMessages: unknown[];
  chatStream: string | null;
  chatSending: boolean;
  chatRunId: string | null;
  requestUpdate?: () => void;
};

function resolveStatus(
  hasData: boolean,
  runActive: boolean,
  starting: boolean,
  prev: GeoDataStatus,
): GeoDataStatus {
  if (hasData) {
    return "ready";
  }
  if (runActive || starting) {
    return "loading";
  }
  return prev === "ready" ? "ready" : "error";
}

export function isGeoStepReady(host: GeoSyncHost, action: GeoSkillAction): boolean {
  switch (action) {
    case "assessment":
      return Boolean(host.geoReport && host.geoReportStatus === "ready");
    case "brandStory":
      return Boolean(host.geoBrandStory && host.geoBrandStoryStatus === "ready");
    case "content":
      return Boolean(host.geoOutputCenter && host.geoOutputStatus === "ready");
    case "fixpack":
      return Boolean(host.geoRepairPack && host.geoRepairPackStatus === "ready");
    case "monitoring":
      return Boolean(host.geoMonitoring && host.geoMonitoringStatus === "ready");
  }
}

function shouldPreserveReadySnapshot<T>(
  parsed: T | null,
  existing: T | null,
  status: GeoDataStatus,
): boolean {
  return parsed === null && existing !== null && status === "ready";
}

function sessionMatchesSkill(host: GeoSyncHost, action: GeoSkillAction): boolean {
  const expected = host.geoSessionKeys[action];
  if (!expected || !host.sessionKey) {
    return false;
  }
  return host.sessionKey === expected;
}

function shouldSyncSkill(
  host: GeoSyncHost,
  action: GeoSkillAction,
  phase: string | undefined,
): boolean {
  if (host.geoPendingSkill === action) {
    return sessionMatchesSkill(host, action);
  }
  if (host.geoPhase === phase) {
    return sessionMatchesSkill(host, action);
  }
  return false;
}

export function syncGeoStateFromChat(host: GeoSyncHost): void {
  const runActive = Boolean(host.chatSending || host.chatRunId);
  const action = host.geoPendingSkill;
  let changed = false;

  if (shouldSyncSkill(host, "assessment", "assessment")) {
    const report = resolveGeoReportFromChat(host.chatMessages, host.chatStream);
    const preserveReport = shouldPreserveReadySnapshot(
      report,
      host.geoReport,
      host.geoReportStatus,
    );
    const nextStatus = resolveStatus(
      Boolean(preserveReport ? host.geoReport : report),
      runActive,
      host.geoStarting,
      host.geoReportStatus,
    );
    if ((!preserveReport && host.geoReport !== report) || host.geoReportStatus !== nextStatus) {
      if (!preserveReport) {
        host.geoReport = report;
      }
      host.geoReportStatus = nextStatus;
      changed = true;
    }
    if (report && host.geoPendingSkill === "assessment") {
      host.geoPendingSkill = null;
    }
  }

  const skillBusy = Boolean(host.geoSkillBusy);

  if (shouldSyncSkill(host, "brandStory", "brandStory")) {
    const parsedStory = resolveParsedFromChat(
      host.chatMessages,
      host.chatStream,
      parseGeoBrandStoryJson,
    );
    const story = parsedStory ? enrichGeoBrandStory(parsedStory, host.geoSiteUrl) : null;
    const preserveStory = shouldPreserveReadySnapshot(
      story,
      host.geoBrandStory,
      host.geoBrandStoryStatus,
    );
    const nextStatus = resolveStatus(
      Boolean(preserveStory ? host.geoBrandStory : story),
      runActive,
      skillBusy,
      host.geoBrandStoryStatus,
    );
    if (
      (!preserveStory && host.geoBrandStory !== story) ||
      host.geoBrandStoryStatus !== nextStatus
    ) {
      if (!preserveStory) {
        host.geoBrandStory = story;
      }
      host.geoBrandStoryStatus = nextStatus;
      changed = true;
    }
    if (story && host.geoPendingSkill === "brandStory") {
      host.geoPendingSkill = null;
    }
  }

  if (shouldSyncSkill(host, "content", "outputCenter")) {
    const output = resolveParsedFromChat(
      host.chatMessages,
      host.chatStream,
      parseGeoOutputCenterJson,
    );
    const preserveOutput = shouldPreserveReadySnapshot(
      output,
      host.geoOutputCenter,
      host.geoOutputStatus,
    );
    const nextStatus = resolveStatus(
      Boolean(preserveOutput ? host.geoOutputCenter : output),
      runActive,
      skillBusy,
      host.geoOutputStatus,
    );
    if (
      (!preserveOutput && host.geoOutputCenter !== output) ||
      host.geoOutputStatus !== nextStatus
    ) {
      if (!preserveOutput) {
        host.geoOutputCenter = output;
      }
      host.geoOutputStatus = nextStatus;
      changed = true;
    }
    if (output && host.geoPendingSkill === "content") {
      host.geoPendingSkill = null;
    }
  }

  if (shouldSyncSkill(host, "fixpack", "repairPack")) {
    const pack = resolveParsedFromChat(host.chatMessages, host.chatStream, parseGeoRepairPackJson);
    const preservePack = shouldPreserveReadySnapshot(
      pack,
      host.geoRepairPack,
      host.geoRepairPackStatus,
    );
    const nextStatus = resolveStatus(
      Boolean(preservePack ? host.geoRepairPack : pack),
      runActive,
      skillBusy,
      host.geoRepairPackStatus,
    );
    if ((!preservePack && host.geoRepairPack !== pack) || host.geoRepairPackStatus !== nextStatus) {
      if (!preservePack) {
        host.geoRepairPack = pack;
      }
      host.geoRepairPackStatus = nextStatus;
      changed = true;
    }
    if (pack && host.geoPendingSkill === "fixpack") {
      host.geoPendingSkill = null;
    }
  }

  if (shouldSyncSkill(host, "monitoring", "monitoringPanel")) {
    const monitoring = resolveParsedFromChat(
      host.chatMessages,
      host.chatStream,
      parseGeoMonitoringJson,
    );
    const preserveMonitoring = shouldPreserveReadySnapshot(
      monitoring,
      host.geoMonitoring,
      host.geoMonitoringStatus,
    );
    const nextStatus = resolveStatus(
      Boolean(preserveMonitoring ? host.geoMonitoring : monitoring),
      runActive,
      skillBusy,
      host.geoMonitoringStatus,
    );
    if (
      (!preserveMonitoring && host.geoMonitoring !== monitoring) ||
      host.geoMonitoringStatus !== nextStatus
    ) {
      if (!preserveMonitoring) {
        host.geoMonitoring = monitoring;
      }
      host.geoMonitoringStatus = nextStatus;
      changed = true;
    }
    if (monitoring && host.geoPendingSkill === "monitoring") {
      host.geoPendingSkill = null;
    }
  }

  if (changed) {
    host.requestUpdate?.();
  }
}

export function resetGeoPhaseData(host: GeoSyncHost): void {
  host.geoReport = null;
  host.geoReportStatus = "idle";
  host.geoBrandStory = null;
  host.geoBrandStoryStatus = "idle";
  host.geoOutputCenter = null;
  host.geoOutputStatus = "idle";
  host.geoRepairPack = null;
  host.geoRepairPackStatus = "idle";
  host.geoMonitoring = null;
  host.geoMonitoringStatus = "idle";
  host.geoPendingSkill = null;
  host.geoSessionKeys = {};
}
