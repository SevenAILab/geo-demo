// geo-lib/content.mjs — SPEC §4A/§4B 内容层：值不值得被引用 / 推荐
import { clamp, num, bool, pts, tier, round2, schemaHits } from "./util.mjs";

// ── §4A 页面内容三维（每维 0–100，累加后 clamp）──

export function contentDepth(s) {
  return clamp(
    tier(s.word_count, [
      [1800, 45],
      [900, 35],
      [500, 25],
      [250, 15],
    ]) +
      tier(s.h2_count, [
        [3, 20],
        [1, 10],
      ]) +
      tier(s.h3_count, [
        [2, 10],
        [1, 5],
      ]) +
      tier(s.list_count, [
        [2, 10],
        [1, 5],
      ]) +
      pts(num(s.table_count) >= 1, 15),
  );
}

export function aiCitability(s) {
  const fp = num(s.first_paragraph_words);
  return clamp(
    pts(bool(s.has_definition_block), 25) +
      pts(bool(s.has_faq_section), 20) +
      tier(s.question_heading_count, [
        [3, 15],
        [1, 8],
      ]) +
      pts(bool(s.has_comparison_table), 15) +
      pts(num(s.table_count) >= 1, 10) +
      pts(num(s.list_count) >= 1, 10) +
      pts(fp >= 18 && fp <= 80, 5),
  );
}

export const SCHEMA_AUTH = ["Article", "Organization", "Service", "Person", "WebSite"];

export function authorityFreshness(s) {
  return clamp(
    pts(bool(s.has_author_signal), 30) +
      pts(bool(s.has_last_updated), 25) +
      tier(s.external_link_count, [
        [3, 20],
        [1, 10],
      ]) +
      pts(schemaHits(s.schema_types, SCHEMA_AUTH), 25),
  );
}

// ── §4B 页面类型校准（[content_depth, ai_citability, authority_freshness] 乘子，其余=1.0）──
export const CALIB = {
  homepage: [0.85, 1.05, 1.1],
  service: [1.0, 1.15, 1.0],
  blog: [1.1, 1.0, 1.05],
  comparison: [1.05, 1.2, 1.0],
  programmatic: [0.9, 0.95, 0.95],
  landing: [0.95, 1.05, 1.0],
  contact: [0.65, 0.8, 1.0],
  about: [0.8, 0.95, 1.15],
  generic: [1.0, 1.0, 1.0],
};

/** calibrated = clamp(round(raw × factor, 2))；乘后再 clamp */
export function calibrate(pageType, raw) {
  const [kd, kc, ka] = CALIB[pageType] || CALIB.generic;
  return {
    content_depth: clamp(round2(raw.content_depth * kd)),
    ai_citability: clamp(round2(raw.ai_citability * kc)),
    authority_freshness: clamp(round2(raw.authority_freshness * ka)),
  };
}

// §4A 页面内容分（0–100）：用校准后值，三维按 20/25/20 加权归一
export const pageContentScore = (cd, ac, af) => (cd * 20 + ac * 25 + af * 20) / 65;
