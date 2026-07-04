// geo-lib/measured.mjs — SPEC §4C 内容层·实测验证（可选，需 probe_runs）
import { num } from "./util.mjs";

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

// 竞品在 probe_runs 里只给名字（competitors_hit:[...]），无各自 rank/stance。
// SPEC 分母是「本品牌+竞品出现」的 pos_decay·stance 之和，但竞品位置未知。
// 实现决定（已在 README/回话中标注）：竞品按 neutral 立场、统一 COMPETITOR_DECAY 计入分母。
// 想更精确须让 geo-probe 产出带 rank 的竞品记录；此常量是唯一可调旋钮。
export const COMPETITOR_DECAY = 0.4;

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
