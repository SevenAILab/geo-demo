// geo-lib/grade.mjs — SPEC §5 等级+红线，§6 战略缺口
import { avg } from "./util.mjs";

// §5 等级（对任意分数通用）
export function gradeFor(score) {
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

// §5 红线：citation_blocked 非空 → site_grade 最高只给 C（覆盖分数）
export function applyRedline(grade, posture) {
  const blocked = (posture?.citation_blocked || []).length > 0;
  if (blocked && (grade === "A" || grade === "B")) return "C";
  return grade;
}

/**
 * §6 战略缺口，命中即列。红线项置顶（unshift）。
 * @param ctx { foundation, posture, categoryAverages, measured }
 */
export function strategicGaps(ctx) {
  const gaps = [];
  const cat = ctx.categoryAverages || {};
  const m = ctx.measured || { available: false };

  // 技术层
  if (ctx.foundation < 70) gaps.push("地基仍有可抓取性 / AI 爬虫 / llms 问题");
  if ((cat.structured_data ?? 100) < 60) gaps.push("结构化数据覆盖太薄，AI 可发现性不足");

  // 内容层
  if ((cat.ai_citability ?? 100) < 55) gaps.push("公开页 FAQ / 直答 / 可引用结构偏弱");
  if ((cat.authority_freshness ?? 100) < 55) gaps.push("权威与新鲜度信号弱（作者 / 更新 / 来源）");
  if ((cat.content_depth ?? 100) < 60) gaps.push("重点页仍需更多深度、标题、表格或列表");

  // 内容层·实测（有实测才判）
  if (m.available && m.share_of_voice < 40) gaps.push("同类提问被竞品压制，需抢差异化空位提问");
  if (m.available && m.mention_rate < 40)
    gaps.push("大量高价值提问里根本没出现，品类词 / 覆盖缺口");

  // 红线置顶
  if ((ctx.posture?.citation_blocked || []).length > 0) {
    gaps.unshift("robots 正在挡实时 AI 引用路径，削弱可发现性");
  }
  return gaps;
}

export { avg };
