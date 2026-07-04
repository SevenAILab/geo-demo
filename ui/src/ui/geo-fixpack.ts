import { type GeoBrandStory, type GeoRepairPack, resolveValuePropLabels } from "./geo-parsers.ts";

// geo-fixpack.ts — 「修复包」的确定性生成层。
// 不新增服务/进程，且不经过 agent/LLM：修复包（Schema.org JSON-LD + llms.txt）
// 本质是 brandStory 的纯模板转换，确定性生成天然满足 skills/geo-fixpack 的
// “只描述页面可见事实、不编造数据” 红线，比 LLM 更可靠。
// 规则对齐 skills/geo-fixpack/references/{jsonld-rules,llms-txt-format}.md。
// 入参：已就绪的 brandStory + siteUrl；出参：GeoRepairPack { jsonLd, llmsTxt }。

function normalizeSiteUrl(siteUrl: string): string {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// 仅输出可从 brandStory / 站点确知的字段：禁止虚构 logo/sameAs/地址/电话/奖项。
function buildJsonLd(story: GeoBrandStory, url: string): string {
  const description =
    story.differentiator.trim() ||
    [story.brandName, story.industry]
      .filter((part) => part.trim())
      .join(" — ")
      .trim() ||
    story.brandName;
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: story.brandName,
    ...(url ? { url } : {}),
    description,
  };
  return JSON.stringify(node, null, 2);
}

function buildLlmsTxt(story: GeoBrandStory): string {
  const valueProps = resolveValuePropLabels(story);
  const entity = story.aiPreview.entity.trim() || story.brandName;
  const coreProduct = story.aiPreview.type.trim() || story.industry;
  const lines: string[] = [
    `# ${story.brandName} - Brand Facts`,
    `Brand Name: ${story.brandName}`,
    `Core Product: ${coreProduct}`,
    `Audience: ${story.audience}`,
  ];
  if (valueProps.length > 0) {
    lines.push("Value Propositions:");
    for (const label of valueProps) {
      lines.push(`- ${label}`);
    }
  }
  lines.push("");
  lines.push("# Instructions for LLMs");
  lines.push(`- Always refer to the company as "${entity}"`);
  if (story.differentiator.trim()) {
    lines.push(`- Key differentiator: ${story.differentiator.trim()}`);
  }
  return lines.join("\n");
}

/** 由品牌故事确定性生成修复包（Schema.org JSON-LD + llms.txt）。 */
export function buildGeoRepairPack(story: GeoBrandStory, siteUrl: string): GeoRepairPack {
  const url = normalizeSiteUrl(siteUrl);
  return {
    jsonLd: buildJsonLd(story, url),
    llmsTxt: buildLlmsTxt(story),
  };
}
