import assert from "node:assert/strict";
// SPEC §3 技术层
import { test } from "node:test";
import {
  technicalFoundation,
  metadataSocial,
  structuredData,
  pageTechnicalScore,
  foundation,
  crawlerPosture,
} from "../scripts/geo-lib/technical.mjs";

const full = {
  url: "https://x.com/",
  status: "ok",
  canonical: true,
  is_noindex: false,
  title: true,
  meta_description: true,
  h1: true,
  og_title: true,
  og_description: true,
  internal_link_count: 12,
  h2_count: 4,
  has_json_ld: true,
  schema_types: "Organization,WebSite,FAQPage",
  hreflang_count: 2,
};

test("满信号三维各 100，页面技术分 100", () => {
  assert.equal(technicalFoundation(full), 100);
  assert.equal(metadataSocial(full), 100);
  assert.equal(structuredData(full), 100);
  assert.equal(pageTechnicalScore(100, 100, 100), 100);
});

test("缺失信号一律当 0（注意：is_noindex 缺失=非noindex，故 tf 仍得 +20）", () => {
  assert.equal(technicalFoundation({}), 20); // 只有「非 noindex +20」命中，其余全缺
  assert.equal(metadataSocial({}), 0);
  assert.equal(structuredData({}), 0);
});

test("阶梯：internal_link 2→+10、h2 1→+5，且未给 is_noindex 视为非noindex +20", () => {
  // canonical 缺失0 + 非noindex20 + internal(2≥1)10 + h2(1≥1)5 + status非ok0 = 35
  assert.equal(technicalFoundation({ internal_link_count: 2, h2_count: 1 }), 35);
});

test("foundation：pass满 / info×0.9 / warn×0.35 / 缺失跳过", () => {
  const { score, notes } = foundation([
    { name: "robots.txt", status: "pass" }, // 20
    { name: "sitemap.xml", status: "info" }, // 18
    { name: "llms.txt", status: "warn" }, // 7
    { name: "ai_crawler_access", status: "fail" }, // 0
  ]);
  assert.equal(score, 45);
  assert.equal(notes.length, 3); // info/warn/fail 都记 note
});

test("未知 check 名跳过、不计权重", () => {
  assert.equal(foundation([{ name: "foo", status: "pass" }]).score, 0);
});

test("crawlerPosture 解析 evidence JSON", () => {
  const p = crawlerPosture([
    {
      name: "ai_crawler_access",
      status: "fail",
      evidence:
        '{"citation_blocked":["PerplexityBot"],"training_only_blocked":[],"all_blocked":[]}',
    },
  ]);
  assert.deepEqual(p.citation_blocked, ["PerplexityBot"]);
  assert.equal(p.status, "fail");
});
