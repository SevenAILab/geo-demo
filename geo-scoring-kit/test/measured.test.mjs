import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// SPEC §4C 实测层 MR/SoV
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { measured, posDecay, STANCE } from "../scripts/geo-lib/measured.mjs";

const fx = JSON.parse(
  readFileSync(new URL("../fixtures/probe_runs.sample.json", import.meta.url), "utf8"),
);

test("位置衰减与立场常量", () => {
  assert.deepEqual(
    [posDecay(1), posDecay(2), posDecay(3), posDecay(9), posDecay(null)],
    [1.0, 0.6, 0.4, 0.2, 0.2],
  );
  assert.deepEqual(STANCE, { rec: 1.0, neutral: 0.5, neg: 0 });
});

test("sample 实测：MR≈66.67, SoV≈60.48（含竞品衰减 0.4）", () => {
  const m = measured(fx.query_set, fx.probe_runs, fx.modelCount, fx.R);
  assert.equal(m.available, true);
  assert.ok(Math.abs(m.mention_rate - 66.67) < 0.05, `MR=${m.mention_rate}`);
  assert.ok(Math.abs(m.share_of_voice - 60.48) < 0.05, `SoV=${m.share_of_voice}`);
  // 实测分 = MR×0.4 + SoV×0.6
  assert.ok(Math.abs(m.measured_score - (m.mention_rate * 0.4 + m.share_of_voice * 0.6)) < 1e-9);
});

test("无 query / 无 runs → available:false", () => {
  assert.equal(measured([], [], 0, 0).available, false);
  assert.equal(measured(fx.query_set, [], 0, 0).available, false);
});
