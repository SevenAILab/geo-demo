// score-log.mjs — GEO 评分运行日志。每次出分追加一条 JSONL，并打一行 console 摘要。
// 与 audit-log.mjs 同风格：写到 outputs/geo-score/_audit/scores.jsonl。
// 纯 IO 边界模块（不进 geo-lib 纯函数层）；写日志失败绝不影响出分。
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOG_DIR = path.join(REPO_ROOT, "outputs", "geo-score", "_audit");
const LOG_FILE = path.join(LOG_DIR, "scores.jsonl");

/** 从 scorecard 摘出关键字段，组装一条日志记录（纯函数，便于测试）。 */
export function buildScoreLogEntry(scorecard, meta = {}) {
  const tech = scorecard?.technical_layer ?? {};
  const content = scorecard?.content_layer ?? {};
  const measured = content?.measured ?? {};
  const gaps = Array.isArray(scorecard?.strategic_gaps) ? scorecard.strategic_gaps : [];
  return {
    ts: new Date().toISOString(),
    url: meta.url ?? null,
    site_score: scorecard?.site_score ?? null,
    site_grade: scorecard?.site_grade ?? null,
    technical_score: tech.score ?? null,
    content_score: content.score ?? null,
    measured: {
      available: measured.available === true,
      mention_rate: measured.mention_rate ?? 0,
      share_of_voice: measured.share_of_voice ?? 0,
    },
    // 优化项（= SPEC §6 战略缺口，报告页的高危警告 / 优化项来源）
    optimization_items: gaps,
    optimization_count: gaps.length,
    pages: Array.isArray(scorecard?.pages) ? scorecard.pages.length : 0,
    probe: meta.probe ?? null,
  };
}

/** 单行 console 摘要（给运行时直接看）。 */
export function formatScoreLogLine(entry) {
  const m = entry.measured?.available
    ? ` | 实测 MR ${Math.round(entry.measured.mention_rate)}/SoV ${Math.round(entry.measured.share_of_voice)}`
    : "";
  return `[geo-score] ${entry.url ?? "?"} → ${Math.round(entry.site_score ?? 0)}/${entry.site_grade ?? "?"} | 技术 ${Math.round(entry.technical_score ?? 0)} 内容 ${Math.round(entry.content_score ?? 0)}${m} | 优化项 ${entry.optimization_count}`;
}

/**
 * 记录一次评分：打 console + 追加 JSONL。绝不抛（日志问题不该影响出分）。
 * @returns 写入的日志条目（便于测试/复用）
 */
export async function logScoreRun(scorecard, meta = {}) {
  const entry = buildScoreLogEntry(scorecard, meta);
  try {
    console.error(formatScoreLogLine(entry));
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`);
  } catch (err) {
    console.error(`[geo-score] log write failed: ${String(err)}`);
  }
  return entry;
}

export { LOG_FILE };
