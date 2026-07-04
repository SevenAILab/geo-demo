import assert from "node:assert/strict";
// SPEC §4A/§4B 内容层三维 + 类型校准
import { test } from "node:test";
import {
  contentDepth,
  aiCitability,
  authorityFreshness,
  calibrate,
  pageContentScore,
  CALIB,
} from "../scripts/geo-lib/content.mjs";

const home = {
  word_count: 1200,
  h2_count: 4,
  h3_count: 3,
  list_count: 2,
  table_count: 1,
  has_definition_block: true,
  has_faq_section: true,
  question_heading_count: 2,
  has_comparison_table: false,
  first_paragraph_words: 42,
  has_author_signal: true,
  has_last_updated: true,
  external_link_count: 4,
  schema_types: "Organization,WebSite,FAQPage",
};

test("三维原始分（校准前）", () => {
  assert.equal(contentDepth(home), 90); // 35+20+10+10+15
  assert.equal(aiCitability(home), 78); // 25+20+8+0+10+10+5
  assert.equal(authorityFreshness(home), 100); // 30+25+20+25
});

test("homepage 校准 [0.85,1.05,1.10]，乘后 clamp", () => {
  const cal = calibrate("homepage", {
    content_depth: 90,
    ai_citability: 78,
    authority_freshness: 100,
  });
  assert.equal(cal.content_depth, 76.5); // 90*0.85
  assert.equal(cal.ai_citability, 81.9); // 78*1.05
  assert.equal(cal.authority_freshness, 100); // 100*1.10=110 → clamp 100
});

test("页面内容分（校准后 20/25/20 归一）", () => {
  const s = pageContentScore(76.5, 81.9, 100);
  assert.ok(Math.abs(s - 85.81) < 0.01); // (1530+2047.5+2000)/65
});

test("未知 page_type 用 generic（全 1.0）", () => {
  const cal = calibrate("unknown-type", {
    content_depth: 50,
    ai_citability: 50,
    authority_freshness: 50,
  });
  assert.deepEqual(cal, { content_depth: 50, ai_citability: 50, authority_freshness: 50 });
  assert.deepEqual(CALIB.generic, [1.0, 1.0, 1.0]);
});

test("缺失信号一律 0", () => {
  assert.equal(contentDepth({}), 0);
  assert.equal(aiCitability({}), 0);
  assert.equal(authorityFreshness({}), 0);
});
