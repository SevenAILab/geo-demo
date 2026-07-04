// geo-lib/measured.mjs — SPEC §4C 内容层·实测验证（可选，需 probe_runs）
import { num, round2 } from "./util.mjs";

// 位置衰减：第1=1.0 第2=0.6 第3=0.4 其后=0.2
export function posDecay(rank) {
  const r = num(rank);
  if (r === 1) return 1.0;
  if (r === 2) return 0.6;
  if (r === 3) return 0.4;
  return 0.2; // rank≥4 或缺失(null→0)：一律尾部权重
}

// 立场：rec=1.0 neutral=0.5 neg=0
export const STANCE = { rec: 1.0, neutral: 0.5, neg: 0 };
const stanceVal = (s) => STANCE[s] ?? STANCE.neutral;

// competitors_hit 现带 {name,rank,stance}（见 geo-probe.mjs）。measured() 的 SoV 分母
// 仍按统一 COMPETITOR_DECAY 计竞品（保持既有 SoV 口径稳定）；竞品的真实名次由
// industryRanking() 消费，用来排「本品牌 vs 竞品」的行业可见性。
export const COMPETITOR_DECAY = 0.4;

// 兼容旧形状：competitors_hit 元素可能是字符串（老 probe_runs）或 {name,...}。
const compName = (c) => (typeof c === "string" ? c : c?.name);

/**
 * @param querySet   [{q, weight}]
 * @param probeRuns  [{q, model, run, mentioned, rank, stance, competitors_hit}]
 * @param modelCount 参与实测的模型数
 * @param R          每题每模型重复次数
 */
export function measured(querySet = [], probeRuns = [], modelCount = 0, R = 0) {
  const denomRuns = modelCount * R;
  const wSum = querySet.reduce((a, q) => a + num(q.weight), 0);
  if (!querySet.length || !denomRuns || !wSum) {
    return { available: false, mention_rate: 0, share_of_voice: 0, measured_score: 0 };
  }

  let mrNum = 0;
  let sovNum = 0;
  for (const { q, weight } of querySet) {
    const runs = probeRuns.filter((p) => p.q === q);

    // 提及率：本品牌被提及次数 / (模型数×R)
    const mentions = runs.filter((p) => p.mentioned).length;
    mrNum += num(weight) * (mentions / denomRuns);

    // 声量：位置衰减 × 立场，本品牌 / (本品牌+竞品)
    let mine = 0;
    let all = 0;
    for (const p of runs) {
      if (p.mentioned) {
        const v = posDecay(p.rank) * stanceVal(p.stance);
        mine += v;
        all += v;
      }
      for (const _ of p.competitors_hit || []) {
        all += COMPETITOR_DECAY * STANCE.neutral;
      }
    }
    sovNum += num(weight) * (all ? mine / all : 0);
  }

  const MR = 100 * (mrNum / wSum);
  const SoV = 100 * (sovNum / wSum);
  // 实测分 = MR×0.4 + SoV×0.6（SoV 更贴近「AI 到底推谁」）
  return {
    available: true,
    mention_rate: MR,
    share_of_voice: SoV,
    measured_score: MR * 0.4 + SoV * 0.6,
  };
}

/**
 * 行业可见性排名（A 口径）：本品牌 + 各竞品在同一 probe 下的加权可见度。
 * 与 SoV 同口径复用 posDecay×stance；每个品牌一个 0–100 分（每轮都排第1且 rec=100）。
 * 竞品名次来自 competitors_hit:[{name,rank,stance}]；旧字符串形状缺名次→按未命中(0)算。
 * @param {{brand?:string, querySet?:Array, probeRuns?:Array, modelCount?:number, R?:number}} p
 * @returns {Array<{name:string, score:number, owned:boolean}>} 按 score 降序；无实测→[]
 */
export function industryRanking({ brand, querySet = [], probeRuns = [], modelCount = 0, R = 0 }) {
  const denomRuns = modelCount * R;
  const wSum = querySet.reduce((a, q) => a + num(q.weight), 0);
  if (!querySet.length || !denomRuns || !wSum) {
    return [];
  }

  // 出现过的竞品名（按名字去重，保持首次出现顺序）
  const compNames = [];
  for (const p of probeRuns) {
    for (const c of p.competitors_hit || []) {
      const name = compName(c);
      if (name && !compNames.includes(name)) {
        compNames.push(name);
      }
    }
  }

  // 单个品牌加权可见度：Σ_q weight×(Σ_runs decay×stance / denomRuns) / wSum ×100
  const visFor = (pick) => {
    let acc = 0;
    for (const { q, weight } of querySet) {
      let s = 0;
      for (const p of probeRuns) {
        if (p.q === q) s += pick(p);
      }
      acc += num(weight) * (s / denomRuns);
    }
    return round2(100 * (acc / wSum));
  };

  const rows = [
    {
      name: brand || "本品牌",
      score: visFor((p) => (p.mentioned ? posDecay(p.rank) * stanceVal(p.stance) : 0)),
      owned: true,
    },
  ];
  for (const name of compNames) {
    const score = visFor((p) => {
      const hit = (p.competitors_hit || []).find((c) => compName(c) === name);
      return hit && typeof hit !== "string" ? posDecay(hit.rank) * stanceVal(hit.stance) : 0;
    });
    rows.push({ name, score, owned: false });
  }
  return rows.sort((a, b) => b.score - a.score);
}
