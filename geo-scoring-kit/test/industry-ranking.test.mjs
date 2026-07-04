import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// 行业可见性排名（A 口径）：本品牌 vs 竞品，同 posDecay×stance 口径。
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { industryRanking } from "../scripts/geo-lib/measured.mjs";

const fx = JSON.parse(
  readFileSync(new URL("../fixtures/probe_runs.sample.json", import.meta.url), "utf8"),
);

test("sample 行业排名：CompA(55) > 本品牌(45) > CompB(24.17)，owned 恰一个", () => {
  const rows = industryRanking({
    brand: "MyBrand",
    querySet: fx.query_set,
    probeRuns: fx.probe_runs,
    modelCount: fx.modelCount,
    R: fx.R,
  });

  // 本品牌 + 两个竞品
  assert.equal(rows.length, 3);
  assert.equal(rows.filter((r) => r.owned).length, 1);
  assert.deepEqual(
    rows.map((r) => r.name),
    ["CompA", "MyBrand", "CompB"],
  );

  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.ok(Math.abs(byName.MyBrand.score - 45) < 0.05, `owned=${byName.MyBrand.score}`);
  assert.ok(Math.abs(byName.CompA.score - 55) < 0.05, `CompA=${byName.CompA.score}`);
  assert.ok(Math.abs(byName.CompB.score - 24.17) < 0.05, `CompB=${byName.CompB.score}`);
  assert.equal(byName.MyBrand.owned, true);

  // 按 score 降序
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i - 1].score >= rows[i].score);
  }
  // 每个分数落在 0–100
  for (const r of rows) {
    assert.ok(r.score >= 0 && r.score <= 100);
  }
});

test("缺 query / 缺 runs → 空排名", () => {
  assert.deepEqual(industryRanking({ brand: "X", querySet: [], probeRuns: [] }), []);
  assert.deepEqual(
    industryRanking({ brand: "X", querySet: fx.query_set, probeRuns: [], modelCount: 0, R: 0 }),
    [],
  );
});

test("旧字符串形状的 competitors_hit → 竞品缺名次按未命中(0)，不抛错", () => {
  const legacy = [
    {
      q: "q1",
      model: "m",
      run: 1,
      mentioned: true,
      rank: 1,
      stance: "rec",
      competitors_hit: ["Old"],
    },
  ];
  const rows = industryRanking({
    brand: "MyBrand",
    querySet: [{ q: "q1", weight: 1 }],
    probeRuns: legacy,
    modelCount: 1,
    R: 1,
  });
  const old = rows.find((r) => r.name === "Old");
  assert.ok(old);
  assert.equal(old.score, 0);
});
