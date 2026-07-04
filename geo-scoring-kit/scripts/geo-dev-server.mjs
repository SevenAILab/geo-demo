#!/usr/bin/env node
// geo-dev-server.mjs — ★ DEV ONLY 测试入口 ★
// 输入一个 URL → 现场跑 站点检查 + 爬页面 + 打分 → 渲染 SPEC §7 报告。
// 只绑 127.0.0.1，不做鉴权/限流，严禁上生产。
//
// 用法:
//   node scripts/geo-dev-server.mjs            # 默认 http://127.0.0.1:8799
//   PORT=9000 node scripts/geo-dev-server.mjs  # 换端口
//
// 路由:
//   GET /               表单页（url 输入，默认案例站）
//   GET /report?url=..  HTML 打分报告（多个页用逗号分隔当优先页）
//   GET /api/score?url= 纯 JSON scorecard（程序调用）
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { crawl } from "./geo-crawl.mjs";
import { contentCategories } from "./geo-lib/content-categories.mjs";
import { probe as runProbe } from "./geo-probe.mjs";
import { scoreSite } from "./geo-score.mjs";
import { siteChecks } from "./geo-site-checks.mjs";
import { logScoreRun } from "./score-log.mjs";

// probe 需要大模型 key。显式从 geo-scoring-kit/.env 加载（不依赖 cwd，网关子进程也生效）。
const KIT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // geo-scoring-kit/
dotenv.config({ path: path.join(KIT_DIR, ".env") });

const PORT = Number(process.env.PORT) || 8799;
const HOST = "127.0.0.1";
const DEFAULT_URL = "https://www.cloudflare.com/"; // 案例默认站，可在表单里改

// probe 输入文件（有 key 才用；缺失/无 key 时 scoreUrl 静默降级为 on-page）
const QUERY_SET_FILE = path.join(KIT_DIR, "out", "probe.query_set.json");
const COMPETITORS_FILE = path.join(KIT_DIR, "out", "probe.competitors.json");
const readJsonSafe = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};
const brandFromUrl = (u) => new URL(u).hostname.replace(/^www\./, "").split(".")[0];

// ── 核心：一个 URL(或逗号分隔多页) → scorecard ──
// opts.probe=true 时，若 out/ 有 query_set 且 env 有对应 key，则真实跑 probe 带上 MR/SoV；
// 否则（缺 key / 缺输入 / 调用失败）静默降级为纯 on-page 评分。
async function scoreUrl(input, opts = {}) {
  const urls = String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!urls.length) throw new Error("empty url");
  const origin = new URL(urls[0]).origin;
  const [checks, pages] = await Promise.all([siteChecks(origin), crawl(urls)]);

  let scoreOpts = { checks };
  let probeInfo = { requested: !!opts.probe, ran: false, reason: "" };
  if (opts.probe) {
    const querySet = readJsonSafe(QUERY_SET_FILE) || [];
    const competitors = readJsonSafe(COMPETITORS_FILE) || [];
    if (!querySet.length) {
      probeInfo.reason = "缺 out/probe.query_set.json";
    } else {
      const brand = opts.brand || brandFromUrl(urls[0]);
      const models = opts.models || "deepseek";
      const runs = Number(opts.runs) || 2;
      try {
        const r = await runProbe({ brand, querySet, competitors, models, runs });
        scoreOpts = {
          checks,
          probeRuns: r.probe_runs,
          querySet,
          modelCount: r.modelCount,
          R: r.R,
          brand, // 供 industryRanking 标注本品牌、排「本品牌 vs 竞品」的行业可见性
          competitors,
        };
        probeInfo = { requested: true, ran: true, brand, models, runs, count: r.probe_runs.length };
      } catch (e) {
        probeInfo.reason = e.message; // 常见：缺 API key → 降级
        console.error("[probe skip]", e.message);
      }
    }
  }

  const scorecard = scoreSite(pages, scoreOpts);
  await logScoreRun(scorecard, { url: urls.join(","), probe: probeInfo });
  return { scorecard, checks, pages, origin, probeInfo };
}

// probe 参数从 query string 解析
function probeOptsFrom(searchParams) {
  return {
    probe: searchParams.get("probe") === "1" || searchParams.get("probe") === "true",
    brand: searchParams.get("brand") || "",
    models: searchParams.get("models") || "",
    runs: searchParams.get("runs") || "",
  };
}

// ── HTML 渲染 ──
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const GRADE_COLOR = { A: "#16a34a", B: "#65a30d", C: "#ca8a04", D: "#ea580c", F: "#dc2626" };

function bar(label, val) {
  const v = Math.max(0, Math.min(100, val));
  const color = v >= 75 ? "#16a34a" : v >= 55 ? "#ca8a04" : "#dc2626";
  return `<div class="bar-row"><span class="bar-label">${esc(label)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${v}%;background:${color}"></span></span>
    <span class="bar-val">${v}</span></div>`;
}

function formPage(url = DEFAULT_URL, error = "") {
  return `<!doctype html><meta charset="utf-8"><title>GEO 打分 · DEV</title>${STYLE}
  <div class="wrap">
    <div class="dev-badge">DEV ONLY · 127.0.0.1</div>
    <h1>GEO 打分测试入口</h1>
    <p class="muted">输入一个 URL，现场跑「站点检查 + 爬页面 + 打分」。多个页面用逗号分隔（首个决定站点 origin）。</p>
    <form action="/report" method="get">
      <input name="url" value="${esc(url)}" placeholder="https://example.com/" autofocus>
      <button type="submit">打分</button>
    </form>
    ${error ? `<div class="err">${esc(error)}</div>` : ""}
    <p class="muted small">JSON 版：<code>/api/score?url=...</code></p>
  </div>`;
}

function reportPage(url, data) {
  const { scorecard: sc } = data;
  const g = sc.site_grade;
  const post = sc.technical_layer.ai_crawler_posture;
  const cat = sc.category_averages;
  const m = sc.content_layer.measured;

  const gaps = sc.strategic_gaps.length
    ? `<ul class="gaps">${sc.strategic_gaps.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : `<p class="muted">无（未命中任何战略缺口）</p>`;

  const pageRows = sc.pages
    .map(
      (p) => `<tr>
    <td class="mono">${esc(p.path)}</td><td>${esc(p.page_type)}</td>
    <td class="num">${p.page_technical_score}</td><td class="num">${p.page_content_score}</td></tr>`,
    )
    .join("");

  const blockList = (arr) => (arr.length ? arr.map(esc).join(", ") : "—");

  return `<!doctype html><meta charset="utf-8"><title>GEO 报告 · ${esc(url)}</title>${STYLE}
  <div class="wrap">
    <div class="dev-badge">DEV ONLY · 127.0.0.1</div>
    <a href="/?url=${encodeURIComponent(url)}" class="back">← 重新打分</a>
    <h1>GEO 打分报告</h1>
    <p class="muted mono">${esc(url)}</p>

    <div class="score-hero">
      <div class="grade" style="background:${GRADE_COLOR[g] || "#666"}">${esc(g)}</div>
      <div>
        <div class="score-num">${sc.site_score}<span class="muted">/100</span></div>
        <div class="muted small">技术层 ${sc.technical_layer.score} × 0.35 ＋ 内容层 ${sc.content_layer.score} × 0.65</div>
      </div>
    </div>

    <div class="cols">
      <section>
        <h2>技术层 · ${sc.technical_layer.score}</h2>
        <div class="muted small">foundation ${sc.technical_layer.foundation_score} × 0.4 ＋ 页面技术均值 ${sc.technical_layer.page_technical_average} × 0.6</div>
        ${bar("technical_foundation", cat.technical_foundation)}
        ${bar("metadata_social", cat.metadata_social)}
        ${bar("structured_data", cat.structured_data)}
        <h3>AI 爬虫姿态 <span class="pill">${esc(post.status)}</span></h3>
        <table class="kv">
          <tr><td>citation_blocked（红线）</td><td class="${post.citation_blocked.length ? "bad" : ""}">${blockList(post.citation_blocked)}</td></tr>
          <tr><td>training_only_blocked</td><td>${blockList(post.training_only_blocked)}</td></tr>
          <tr><td>all_blocked</td><td>${blockList(post.all_blocked)}</td></tr>
        </table>
      </section>

      <section>
        <h2>内容层 · ${sc.content_layer.score}</h2>
        <div class="muted small">页面内容均值 ${sc.content_layer.page_content_average}${m.available ? ` × 0.7 ＋ 实测 ${m.measured_score} × 0.3` : "（无实测）"}</div>
        ${bar("content_depth", cat.content_depth)}
        ${bar("ai_citability", cat.ai_citability)}
        ${bar("authority_freshness", cat.authority_freshness)}
        ${
          m.available
            ? `<h3>实测验证</h3><table class="kv">
          <tr><td>提及率 MR</td><td>${m.mention_rate}</td></tr>
          <tr><td>声量 SoV</td><td>${m.share_of_voice}</td></tr></table>`
            : ""
        }
      </section>
    </div>

    <h2>战略缺口</h2>
    ${gaps}

    <h2>逐页明细</h2>
    <table class="pages">
      <thead><tr><th>path</th><th>page_type</th><th>技术分</th><th>内容分</th></tr></thead>
      <tbody>${pageRows}</tbody>
    </table>

    <details><summary>原始 JSON scorecard</summary><pre>${esc(JSON.stringify(sc, null, 2))}</pre></details>
  </div>`;
}

const STYLE = `<style>
  :root{font-family:ui-sans-serif,system-ui,'Segoe UI',sans-serif}
  body{margin:0;background:#0f1116;color:#e6e8ec}
  .wrap{max-width:900px;margin:0 auto;padding:32px 24px 64px}
  h1{font-size:22px;margin:.2em 0}h2{font-size:16px;margin:1.4em 0 .6em;border-bottom:1px solid #2a2f3a;padding-bottom:.3em}
  h3{font-size:13px;margin:1.1em 0 .4em;color:#aab}
  .muted{color:#8b93a1}.small{font-size:12px}.mono{font-family:ui-monospace,Menlo,monospace}
  .dev-badge{display:inline-block;background:#3a1d1d;color:#ff8f8f;border:1px solid #6b2b2b;font-size:11px;
    letter-spacing:.08em;padding:2px 8px;border-radius:4px;margin-bottom:14px}
  form{display:flex;gap:8px;margin:14px 0}
  input{flex:1;background:#1a1e26;border:1px solid #2a2f3a;color:#e6e8ec;padding:10px 12px;border-radius:8px;font-size:14px}
  button{background:#2563eb;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer}
  button:hover{background:#1d4ed8}
  .err{background:#3a1d1d;color:#ff9f9f;border:1px solid #6b2b2b;padding:10px 12px;border-radius:8px;margin-top:12px}
  .back{color:#7aa2ff;text-decoration:none;font-size:13px}
  .score-hero{display:flex;align-items:center;gap:18px;margin:18px 0 6px}
  .grade{font-size:40px;font-weight:700;color:#fff;width:72px;height:72px;border-radius:14px;display:flex;align-items:center;justify-content:center}
  .score-num{font-size:34px;font-weight:700}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  @media(max-width:680px){.cols{grid-template-columns:1fr}}
  .bar-row{display:flex;align-items:center;gap:10px;margin:6px 0;font-size:12px}
  .bar-label{width:150px;color:#aab;flex:none}
  .bar-track{flex:1;height:8px;background:#1a1e26;border-radius:5px;overflow:hidden}
  .bar-fill{display:block;height:100%}
  .bar-val{width:34px;text-align:right;flex:none}
  table{border-collapse:collapse;width:100%;font-size:13px}
  .kv td{padding:3px 8px;border-bottom:1px solid #20242e}.kv td:first-child{color:#8b93a1}
  .bad{color:#ff8f8f;font-weight:600}
  .pill{background:#173a1f;color:#7ee29a;font-size:11px;padding:1px 8px;border-radius:10px}
  .pages th,.pages td{text-align:left;padding:6px 8px;border-bottom:1px solid #20242e}
  .pages .num,.num{text-align:right}
  .gaps{margin:0;padding-left:18px}.gaps li{margin:4px 0;color:#ffcf8f}
  details{margin-top:24px}summary{cursor:pointer;color:#8b93a1;font-size:13px}
  pre{background:#0a0c10;border:1px solid #20242e;border-radius:8px;padding:14px;overflow:auto;font-size:12px}
  code{background:#1a1e26;padding:1px 6px;border-radius:4px}
</style>`;

// ── HTTP ──
// dev-only：开放 CORS，让 UI（网关服务的浏览器页）能跨端口 fetch 本评分后端做联调。
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
}
function send(res, code, body, type = "text/html; charset=utf-8") {
  res.writeHead(code, { "content-type": type });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${HOST}:${PORT}`);
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  try {
    if (u.pathname === "/") {
      return send(res, 200, formPage(u.searchParams.get("url") || DEFAULT_URL));
    }
    if (u.pathname === "/report") {
      const url = u.searchParams.get("url");
      if (!url) return send(res, 200, formPage(DEFAULT_URL, "请输入 URL"));
      console.error(`[report] ${url}`);
      const data = await scoreUrl(url, probeOptsFrom(u.searchParams));
      return send(res, 200, reportPage(url, data));
    }
    if (u.pathname === "/api/score") {
      const url = u.searchParams.get("url");
      if (!url) return send(res, 400, JSON.stringify({ error: "missing url" }), "application/json");
      const opts = probeOptsFrom(u.searchParams);
      console.error(`[api] ${url}${opts.probe ? " (+probe)" : ""}`);
      const data = await scoreUrl(url, opts);
      return send(
        res,
        200,
        JSON.stringify({ ...data.scorecard, _probe: data.probeInfo }, null, 2),
        "application/json; charset=utf-8",
      );
    }
    if (u.pathname === "/api/content") {
      // 产出中心「四大修复大类」：同 /api/score 无状态地现场评分，再把 scorecard 派生成 4 类卡片。
      // 代价：会再跑一次 站点检查+爬页面（数秒）；dev-only 联调工具可接受。
      const url = u.searchParams.get("url");
      if (!url) return send(res, 400, JSON.stringify({ error: "missing url" }), "application/json");
      const brand = u.searchParams.get("brand") || "";
      console.error(`[api] content ${url}`);
      const data = await scoreUrl(url);
      const out = contentCategories(data.scorecard, { brand });
      return send(res, 200, JSON.stringify(out, null, 2), "application/json; charset=utf-8");
    }
    send(res, 404, formPage(DEFAULT_URL, `未知路径: ${u.pathname}`));
  } catch (e) {
    console.error("[error]", e.message);
    if (u.pathname === "/api/score" || u.pathname === "/api/content")
      return send(res, 500, JSON.stringify({ error: e.message }), "application/json");
    send(res, 200, formPage(u.searchParams.get("url") || DEFAULT_URL, `打分失败: ${e.message}`));
  }
});

server.listen(PORT, HOST, () => {
  console.error(`\n  ★ GEO 打分测试入口 (DEV ONLY) ★`);
  console.error(`  → http://${HOST}:${PORT}`);
  console.error(`  默认案例站: ${DEFAULT_URL}`);
  console.error(`  JSON: http://${HOST}:${PORT}/api/score?url=<URL>\n`);
});
