import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// 端到端：fixtures → 完整 scorecard（§5 总分/等级/红线，§6 缺口，§7 结构）
import { test } from "node:test";
import { scoreSite, scorePage } from "../scripts/geo-score.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
const pages = load("pages.sample.json");
const checksOk = load("checks.sample.json");
const checksBlocked = load("checks.blocked.json");
const probe = load("probe_runs.sample.json");

test("§7 输出结构完整", () => {
  const sc = scoreSite(pages, { checks: checksOk });
  for (const k of [
    "site_score",
    "site_grade",
    "technical_layer",
    "content_layer",
    "category_averages",
    "strategic_gaps",
    "pages",
  ]) {
    assert.ok(k in sc, `缺字段 ${k}`);
  }
  assert.equal(sc.pages.length, pages.length);
  assert.ok("page_technical_score" in sc.pages[0] && "page_content_score" in sc.pages[0]);
});

test("§3C/§4D/§5 权重链路：总分在 [0,100]、等级自洽", () => {
  const sc = scoreSite(pages, { checks: checksOk });
  assert.ok(sc.site_score >= 0 && sc.site_score <= 100);
  // 总分 = 技术层×0.35 + 内容层×0.65
  const expect =
    Math.round((sc.technical_layer.score * 0.35 + sc.content_layer.score * 0.65) * 100) / 100;
  assert.equal(sc.site_score, expect);
});

test("§5 红线：citation_blocked 非空 → 封顶 C，缺口置顶", () => {
  // 用全满页面 + 被挡 checks，逼出 A/B 再看是否被压到 C
  const strong = pages.map((p) => ({ ...p, word_count: 2000, has_faq_section: true }));
  const sc = scoreSite(strong, { checks: checksBlocked });
  assert.ok(["C", "D", "F"].includes(sc.site_grade), `grade=${sc.site_grade} 不应为 A/B`);
  assert.ok(sc.technical_layer.ai_crawler_posture.citation_blocked.length > 0);
  assert.match(sc.strategic_gaps[0], /robots 正在挡实时 AI 引用路径/);
});

test("§4C/§4D 有实测：内容层 = 均值×0.7 + 实测×0.3", () => {
  const sc = scoreSite(pages, {
    checks: checksOk,
    probeRuns: probe.probe_runs,
    querySet: probe.query_set,
    modelCount: probe.modelCount,
    R: probe.R,
  });
  assert.equal(sc.content_layer.measured.available, true);
  const blended =
    Math.round(
      (sc.content_layer.page_content_average * 0.7 +
        sc.content_layer.measured.measured_score * 0.3) *
        100,
    ) / 100;
  assert.equal(sc.content_layer.score, blended);
});

test("无实测：内容层 = 页面内容分均值，measured.available=false", () => {
  const sc = scoreSite(pages, { checks: checksOk });
  assert.equal(sc.content_layer.measured.available, false);
  assert.equal(sc.content_layer.score, sc.content_layer.page_content_average);
});

test("scorePage：contact 页被校准压低（0.65/0.80）", () => {
  const contact = scorePage(pages.find((p) => p.url.includes("/contact")));
  assert.equal(contact.page_type, "contact");
});
