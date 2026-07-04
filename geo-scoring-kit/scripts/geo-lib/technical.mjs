// geo-lib/technical.mjs — SPEC §3 技术层：能不能被抓到、读懂、索引
import { clamp, num, bool, pts, tier, schemaHits } from "./util.mjs";

// ── §3A 页面技术三维（每维 0–100，累加后 clamp）──

export function technicalFoundation(s) {
  return clamp(
    pts(bool(s.canonical), 35) +
      pts(!bool(s.is_noindex), 20) +
      tier(s.internal_link_count, [
        [3, 20],
        [1, 10],
      ]) +
      tier(s.h2_count, [
        [2, 15],
        [1, 5],
      ]) +
      pts(s.status === "ok", 10),
  );
}

export function metadataSocial(s) {
  return clamp(
    pts(bool(s.title), 25) +
      pts(bool(s.meta_description), 25) +
      pts(bool(s.h1), 20) +
      pts(bool(s.og_title), 15) +
      pts(bool(s.og_description), 15),
  );
}

export const SCHEMA_TECH = [
  "Organization",
  "WebSite",
  "Service",
  "FAQPage",
  "Article",
  "BreadcrumbList",
];

export function structuredData(s) {
  return clamp(
    pts(bool(s.has_json_ld), 50) +
      pts(schemaHits(s.schema_types, SCHEMA_TECH), 35) +
      pts(num(s.hreflang_count) > 0, 15),
  );
}

// §3A 页面技术分（0–100）：三维按 15/10/10 加权归一
export const pageTechnicalScore = (tf, ms, sd) => (tf * 15 + ms * 10 + sd * 10) / 35;

// ── §3B 站点技术地基 foundation（0–100）──
// pass=满权重 / info=×0.90 / warn=×0.35 / 其它(fail…)=0；缺失该 check 则跳过、不计权重。
export const CHECK_WEIGHTS = {
  "robots.txt": 20,
  "sitemap.xml": 20,
  "llms.txt": 20,
  ai_crawler_access: 40,
};

const STATUS_FACTOR = { pass: 1, info: 0.9, warn: 0.35 };

export function foundation(checks = []) {
  const notes = [];
  let score = 0;
  for (const c of checks) {
    const weight = CHECK_WEIGHTS[c.name];
    if (weight == null) continue;
    const factor = STATUS_FACTOR[c.status] ?? 0;
    if (factor < 1) notes.push(`${c.name}:${c.status}${c.detail ? ` (${c.detail})` : ""}`);
    score += weight * factor;
  }
  return { score: clamp(score), notes };
}

// §3B AI 爬虫姿态：读 ai_crawler_access 的 evidence(JSON)，提取三类阻断名单
export function crawlerPosture(checks = []) {
  const check = checks.find((c) => c.name === "ai_crawler_access");
  let ev = {};
  try {
    ev = check?.evidence
      ? typeof check.evidence === "string"
        ? JSON.parse(check.evidence)
        : check.evidence
      : {};
  } catch {
    ev = {};
  }
  return {
    status: check?.status || "unknown",
    citation_blocked: ev.citation_blocked || [],
    training_only_blocked: ev.training_only_blocked || [],
    all_blocked: ev.all_blocked || [],
  };
}
