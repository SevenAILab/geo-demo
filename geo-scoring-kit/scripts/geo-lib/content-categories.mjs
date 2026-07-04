// geo-lib/content-categories.mjs — scorecard → 产出中心「四大修复大类」卡片
// 纯函数、零依赖，可脱离爬虫/大模型单测。对齐 skills/geo-content 的输出契约：
//   { categories: [恰好 4 条] }，每条 { id, title, description, impact, tags }
//   tags ∈ techInfra|brandContent|structure|continuousArticle；impact ∈ high|medium|low
// 取代原 LLM 提示词实现：把「体检 scorecard 的缺口」确定性地翻成 4 类修复说明。
import { num } from "./util.mjs";

// 命中阈值即拼一句缺口说明（writing-discipline：每段 ≤3 句、无行话堆砌）。
function joinGaps(brand, hits) {
  const who = brand ? `${brand} ` : "";
  if (!hits.length) return `${who}该维度暂无明显缺口，保持并小步优化即可。`;
  return `${who}${hits.join("；")}。`;
}

// impact 三档：命中任一 high 条件→high；命中任一 mid 条件→medium；否则 low。
function pickImpact(highHit, midHit) {
  if (highHit) return "high";
  if (midHit) return "medium";
  return "low";
}

/**
 * @param {object} sc  geo-score.mjs scoreSite() 输出的 scorecard
 * @param {{brand?: string}} [opts]
 * @returns {{ categories: Array<{id,title,description,impact,tags}> }}
 */
export function contentCategories(sc, opts = {}) {
  const brand = (opts.brand || "").trim();
  const tech = sc?.technical_layer || {};
  const content = sc?.content_layer || {};
  const cat = sc?.category_averages || {};
  const posture = tech.ai_crawler_posture || {};
  const measured = content.measured || { available: false };

  const foundation = num(tech.foundation_score);
  const techScore = num(tech.score);
  const structuredData = num(cat.structured_data);
  const citationBlocked = (posture.citation_blocked || []).length > 0;

  const contentScore = num(content.score);
  const contentDepth = num(cat.content_depth);
  const aiCitability = num(cat.ai_citability);
  const metadataSocial = num(cat.metadata_social);
  const authorityFreshness = num(cat.authority_freshness);
  const sov = num(measured.share_of_voice);
  const mr = num(measured.mention_rate);

  // ── 1) 技术基建修复 ──
  const techHits = [];
  if (citationBlocked) techHits.push("robots 正在挡实时 AI 引用路径，需先放开可发现性");
  if (foundation < 70) techHits.push("地基抓取性 / sitemap / llms.txt 仍有缺口");
  if (structuredData < 60) techHits.push("结构化数据覆盖太薄，AI 难以发现与索引");
  const techInfra = {
    id: "tech-infra",
    title: "技术基建修复",
    description: joinGaps(brand, techHits),
    impact: pickImpact(citationBlocked || foundation < 70 || structuredData < 60, techScore < 75),
    tags: ["techInfra"],
  };

  // ── 2) 品牌内容修复 ──
  const brandHits = [];
  if (contentDepth < 60) brandHits.push("重点页深度不足，缺标题 / 表格 / 列表支撑");
  if (authorityFreshness < 55) brandHits.push("权威与新鲜度信号弱（作者 / 更新 / 来源）");
  if (contentScore < 55) brandHits.push("整体内容力偏弱，承重事实与可引用结构待补");
  const brandContent = {
    id: "brand-content",
    title: "品牌内容修复",
    description: joinGaps(brand, brandHits),
    impact: pickImpact(contentScore < 55 || contentDepth < 60, contentScore < 75),
    tags: ["brandContent", "structure"],
  };

  // ── 3) 结构呈现修复 ──
  const structHits = [];
  if (aiCitability < 55) structHits.push("公开页 FAQ / 直答 / 可引用结构偏弱");
  if (metadataSocial < 60) structHits.push("元信息与社交卡不全，摘要呈现打折");
  if (structuredData < 60) structHits.push("缺 FAQPage / 对比表等可被直接引用的结构块");
  const structure = {
    id: "structure",
    title: "结构呈现修复",
    description: joinGaps(brand, structHits),
    impact: pickImpact(aiCitability < 55 || metadataSocial < 60, aiCitability < 75),
    tags: ["structure"],
  };

  // ── 4) 持续文章修复 ──
  const articleHits = [];
  if (authorityFreshness < 55) articleHits.push("更新与作者署名不足，需持续产出可引用长文");
  if (measured.available && sov < 40)
    articleHits.push(`同类提问被竞品压制（SoV ${Math.round(sov)}），抢差异化空位提问`);
  if (measured.available && mr < 40)
    articleHits.push(`高价值提问里出现太少（MR ${Math.round(mr)}），补品类词覆盖`);
  const continuousArticle = {
    id: "continuous-article",
    title: "持续文章修复",
    description: joinGaps(brand, articleHits),
    impact: pickImpact(
      authorityFreshness < 55 || (measured.available && sov < 40),
      authorityFreshness < 75,
    ),
    tags: ["continuousArticle", "brandContent"],
  };

  return { categories: [techInfra, brandContent, structure, continuousArticle] };
}
