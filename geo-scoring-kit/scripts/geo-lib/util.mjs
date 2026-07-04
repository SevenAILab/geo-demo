// geo-lib/util.mjs — 打分器共用的小工具（无副作用）
// 所有维度都在 [0,100] 累加后 clamp；缺失信号一律当 falsy/0（对齐 SPEC「缺失/False/0」口径）。

export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const bool = (v) => v === true;

/** 条件计分：命中给 n 分，否则 0（比 `cond && n` 干净，避免返回布尔值） */
export const pts = (cond, n) => (cond ? n : 0);

/** 阶梯计分：thresholds 形如 [[1800,45],[900,35],...] 从高到低，命中即返回 */
export function tier(value, thresholds) {
  const v = num(value);
  for (const [min, score] of thresholds) if (v >= min) return score;
  return 0;
}

export const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export const round2 = (n) => Math.round(n * 100) / 100;

/** schema_types 字符串 "Organization,FAQPage" → 是否与白名单有交集 */
export function schemaHits(schemaTypes, whitelist) {
  const set = new Set(
    (schemaTypes || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return whitelist.some((t) => set.has(t));
}
