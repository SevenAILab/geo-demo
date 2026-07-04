import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// scorecard → 4 类修复卡片：契约（恰好 4 条 / tags / impact / 非空文案）+ 红线拉高 tech-infra。
import { test } from "node:test";
import { contentCategories } from "../scripts/geo-lib/content-categories.mjs";
import { scoreSite } from "../scripts/geo-score.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const pages = load("pages.sample.json");
const checksOk = load("checks.sample.json");
const checksBlocked = load("checks.blocked.json");
const probe = load("probe_runs.sample.json");

const ALLOWED_TAGS = new Set(["techInfra", "brandContent", "structure", "continuousArticle"]);
const IMPACTS = new Set(["high", "medium", "low"]);
const EXPECTED = [
  { id: "tech-infra", tags: ["techInfra"] },
  { id: "brand-content", tags: ["brandContent", "structure"] },
  { id: "structure", tags: ["structure"] },
  { id: "continuous-article", tags: ["continuousArticle", "brandContent"] },
];

test("契约：恰好 4 条，id/tags 固定，impact 与文案合法", () => {
  const sc = scoreSite(pages, { checks: checksOk });
  const { categories } = contentCategories(sc, { brand: "示例品牌" });

  assert.equal(categories.length, 4);
  categories.forEach((c, i) => {
    assert.equal(c.id, EXPECTED[i].id);
    assert.deepEqual(c.tags, EXPECTED[i].tags);
    // tags：长 1–4、去重、白名单内
    assert.ok(c.tags.length >= 1 && c.tags.length <= 4);
    assert.equal(new Set(c.tags).size, c.tags.length);
    for (const tag of c.tags) assert.ok(ALLOWED_TAGS.has(tag), `坏 tag: ${tag}`);
    assert.ok(IMPACTS.has(c.impact), `坏 impact: ${c.impact}`);
    assert.equal(typeof c.title, "string");
    assert.ok(c.title.length > 0);
    assert.equal(typeof c.description, "string");
    assert.ok(c.description.length > 0);
    // 有品牌名时文案点名品牌
    assert.ok(c.description.includes("示例品牌"));
  });
});

test("红线：citation_blocked 非空 → 技术基建修复 impact=high", () => {
  const sc = scoreSite(pages, { checks: checksBlocked });
  assert.ok(sc.technical_layer.ai_crawler_posture.citation_blocked.length > 0);
  const { categories } = contentCategories(sc);
  const techInfra = categories.find((c) => c.id === "tech-infra");
  assert.equal(techInfra.impact, "high");
  assert.match(techInfra.description, /robots/);
});

test("有实测：SoV 偏低 → 持续文章修复带 SoV 文案", () => {
  const sc = scoreSite(pages, {
    checks: checksOk,
    probeRuns: probe,
    querySet: [{ id: "q1" }, { id: "q2" }],
    modelCount: 2,
    R: 3,
  });
  const { categories } = contentCategories(sc);
  const article = categories.find((c) => c.id === "continuous-article");
  assert.ok(article.description.length > 0);
  if (sc.content_layer.measured.available && sc.content_layer.measured.share_of_voice < 40) {
    assert.match(article.description, /SoV/);
  }
});

test("缺信号也稳健：空 scorecard 仍产出 4 条合法卡片", () => {
  const { categories } = contentCategories({});
  assert.equal(categories.length, 4);
  categories.forEach((c) => {
    assert.ok(IMPACTS.has(c.impact));
    assert.ok(c.description.length > 0);
  });
});
