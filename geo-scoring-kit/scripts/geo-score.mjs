#!/usr/bin/env node
// geo-score.mjs — SPEC 组装层：吃信号 → §7 scorecard JSON
// 纯函数（scorePage/scoreSite），不碰网络/大模型，可脱离爬虫单测。
// CLI:  node geo-score.mjs --pages pages.json --checks checks.json [--probe probe.json] [--queries q.json --models N --runs R]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentDepth,
  aiCitability,
  authorityFreshness,
  calibrate,
  pageContentScore,
} from "./geo-lib/content.mjs";
import { gradeFor, applyRedline, strategicGaps } from "./geo-lib/grade.mjs";
import { measured } from "./geo-lib/measured.mjs";
import { pageType, pathOf } from "./geo-lib/page-type.mjs";
import {
  technicalFoundation,
  metadataSocial,
  structuredData,
  pageTechnicalScore,
  foundation,
  crawlerPosture,
} from "./geo-lib/technical.mjs";
import { avg, round2 } from "./geo-lib/util.mjs";

// ── 页面级打分（§3A + §4A/§4B）──
export function scorePage(s) {
  const type = pageType(s.url, s.schema_types);

  const tf = technicalFoundation(s);
  const ms = metadataSocial(s);
  const sd = structuredData(s);

  const raw = {
    content_depth: contentDepth(s),
    ai_citability: aiCitability(s),
    authority_freshness: authorityFreshness(s),
  };
  const cal = calibrate(type, raw); // §4B 乘后再 clamp

  return {
    path: pathOf(s.url),
    page_type: type,
    technical_foundation: tf,
    metadata_social: ms,
    structured_data: sd,
    content_depth: cal.content_depth,
    ai_citability: cal.ai_citability,
    authority_freshness: cal.authority_freshness,
    page_technical_score: round2(pageTechnicalScore(tf, ms, sd)),
    page_content_score: round2(
      pageContentScore(cal.content_depth, cal.ai_citability, cal.authority_freshness),
    ),
  };
}

// ── 站点级打分（§3C + §4D + §5 + §6）──
// opts: { checks, querySet, probeRuns, modelCount, R }
export function scoreSite(pages = [], opts = {}) {
  const scored = pages.map(scorePage);
  const { score: fnd, notes: foundationNotes } = foundation(opts.checks);
  const posture = crawlerPosture(opts.checks);

  const pageTechAvg = round2(avg(scored.map((p) => p.page_technical_score)));
  const pageContentAvg = round2(avg(scored.map((p) => p.page_content_score)));

  // §3C 技术层 = 页面技术分均值×0.6 + foundation×0.4
  const technicalLayer = round2(pageTechAvg * 0.6 + fnd * 0.4);

  // §4C 实测（可选）
  const m = opts.probeRuns?.length
    ? measured(opts.querySet, opts.probeRuns, opts.modelCount, opts.R)
    : { available: false, mention_rate: 0, share_of_voice: 0, measured_score: 0 };

  // §4D 内容层 = 均值（无实测）/ 均值×0.7 + 实测×0.3（有实测）
  const contentLayer = round2(
    m.available ? pageContentAvg * 0.7 + m.measured_score * 0.3 : pageContentAvg,
  );

  // §5 站点总分与等级 + 红线
  const siteScore = round2(technicalLayer * 0.35 + contentLayer * 0.65);
  const grade = applyRedline(gradeFor(siteScore), posture);

  const categoryAverages = {
    technical_foundation: round2(avg(scored.map((p) => p.technical_foundation))),
    metadata_social: round2(avg(scored.map((p) => p.metadata_social))),
    structured_data: round2(avg(scored.map((p) => p.structured_data))),
    content_depth: round2(avg(scored.map((p) => p.content_depth))),
    ai_citability: round2(avg(scored.map((p) => p.ai_citability))),
    authority_freshness: round2(avg(scored.map((p) => p.authority_freshness))),
  };

  const gaps = strategicGaps({
    foundation: fnd,
    posture,
    categoryAverages,
    measured: m,
  });

  return {
    site_score: siteScore,
    site_grade: grade,
    technical_layer: {
      score: technicalLayer,
      foundation_score: round2(fnd),
      foundation_notes: foundationNotes,
      page_technical_average: pageTechAvg,
      ai_crawler_posture: {
        status: posture.status,
        citation_blocked: posture.citation_blocked,
        training_only_blocked: posture.training_only_blocked,
        all_blocked: posture.all_blocked,
      },
    },
    content_layer: {
      score: contentLayer,
      page_content_average: pageContentAvg,
      measured: {
        available: m.available,
        mention_rate: round2(m.mention_rate),
        share_of_voice: round2(m.share_of_voice),
        measured_score: round2(m.measured_score),
      },
    },
    category_averages: categoryAverages,
    strategic_gaps: gaps,
    pages: scored,
  };
}

// ── CLI ──
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--"))
      out[a.slice(2)] = argv[i + 1]?.startsWith("--") || i + 1 >= argv.length ? true : argv[++i];
  }
  return out;
}

function cliMain() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pages) {
    console.error("Usage: node geo-score.mjs --pages pages.json --checks checks.json \\");
    console.error(
      "         [--probe probe_runs.json --queries query_set.json --models N --runs R]",
    );
    process.exit(2);
  }
  const pages = readJson(args.pages);
  const opts = { checks: args.checks ? readJson(args.checks) : [] };
  if (args.probe) {
    opts.probeRuns = readJson(args.probe);
    opts.querySet = args.queries ? readJson(args.queries) : [];
    opts.modelCount = Number(args.models) || 0;
    opts.R = Number(args.runs) || 0;
  }
  const scorecard = scoreSite(pages, opts);
  console.log(JSON.stringify(scorecard, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    cliMain();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
