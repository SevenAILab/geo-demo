// score-log.test.mjs — GEO 评分日志：条目组装 + 摘要行（纯函数）
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildScoreLogEntry, formatScoreLogLine } from "../scripts/score-log.mjs";

const scorecard = {
  site_score: 71.11,
  site_grade: "C",
  technical_layer: { score: 86.91 },
  content_layer: {
    score: 62.6,
    measured: { available: false, mention_rate: 0, share_of_voice: 0, measured_score: 0 },
  },
  strategic_gaps: ["robots 正在挡实时 AI 引用路径", "重点页仍需更多深度"],
  pages: [{ path: "/" }, { path: "/about" }],
};

test("buildScoreLogEntry 摘出评分 + 优化项", () => {
  const e = buildScoreLogEntry(scorecard, { url: "https://acme.com" });
  assert.equal(e.url, "https://acme.com");
  assert.equal(e.site_score, 71.11);
  assert.equal(e.site_grade, "C");
  assert.equal(e.technical_score, 86.91);
  assert.equal(e.content_score, 62.6);
  assert.equal(e.optimization_count, 2);
  assert.deepEqual(e.optimization_items, scorecard.strategic_gaps);
  assert.equal(e.pages, 2);
  assert.equal(e.measured.available, false);
  assert.ok(typeof e.ts === "string" && e.ts.includes("T"));
});

test("缺字段时兜底，不抛", () => {
  const e = buildScoreLogEntry({}, {});
  assert.equal(e.site_score, null);
  assert.equal(e.optimization_count, 0);
  assert.deepEqual(e.optimization_items, []);
  assert.equal(e.pages, 0);
});

test("formatScoreLogLine 含分数/层/优化项", () => {
  const line = formatScoreLogLine(buildScoreLogEntry(scorecard, { url: "https://acme.com" }));
  assert.match(line, /\[geo-score\]/);
  assert.match(line, /71\/C/);
  assert.match(line, /技术 87 内容 63/);
  assert.match(line, /优化项 2/);
});

test("有实测时摘要行带 MR/SoV", () => {
  const withM = {
    ...scorecard,
    content_layer: {
      score: 68.68,
      measured: {
        available: true,
        mention_rate: 100,
        share_of_voice: 71.43,
        measured_score: 82.86,
      },
    },
  };
  const line = formatScoreLogLine(buildScoreLogEntry(withM, { url: "x" }));
  assert.match(line, /实测 MR 100\/SoV 71/);
});
