#!/usr/bin/env node
// geo-site-checks.mjs — 站点级检查（零依赖，纯 fetch）
// 产出 SPEC §1 的 checks[]：robots.txt / sitemap.xml / llms.txt / ai_crawler_access。
// ai_crawler_access.evidence 是 JSON 字符串，含 citation_blocked / training_only_blocked / all_blocked。
// 用法: node geo-site-checks.mjs https://example.com [--json]
import path from "node:path";
import { fileURLToPath } from "node:url";

// 引用型 AI 爬虫（实时抓取给出处，被挡 = 红线）
const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "ChatGPT-User",
  "Google-Extended",
  "Applebot-Extended",
];
// 训练型爬虫（只影响训练语料，不影响实时引用）
const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider"];

// 带常见浏览器 UA：不少 CDN（NYT/Cloudflare 等）会挡 header-less 的 fetch，返回 0/403。
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 geo-scoring-kit";

async function fetchText(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "*/*" },
    });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
  } catch (e) {
    return { ok: false, status: 0, text: "", error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// 极简 robots.txt 解析：按 User-agent 段收集 Disallow
function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/#.*$/, "").trim();
    if (!m) continue;
    const [rawKey, ...rest] = m.split(":");
    const key = rawKey.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.disallow.length || current.allow.length) {
        current = { agents: [val], disallow: [], allow: [] };
        groups.push(current);
      } else {
        current.agents.push(val); // 连续 UA 共享同一规则块
      }
    } else if (current && key === "disallow") {
      current.disallow.push(val);
    } else if (current && key === "allow") {
      current.allow.push(val);
    }
  }
  return groups;
}

// 某 bot 是否被整站禁抓（Disallow: /，且无更具体 Allow）
function isBlocked(groups, bot) {
  const lc = bot.toLowerCase();
  const match = groups.filter((g) => g.agents.some((a) => a.toLowerCase() === lc));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const applicable = match.length ? match : wildcard;
  return applicable.some((g) => g.disallow.includes("/") && !g.allow.length);
}

export async function siteChecks(origin) {
  const base = new URL(origin).origin;
  const checks = [];

  // robots.txt
  const robots = await fetchText(`${base}/robots.txt`);
  const robotsGroups = robots.ok ? parseRobots(robots.text) : [];
  checks.push({
    name: "robots.txt",
    status: robots.ok ? "pass" : robots.status === 404 ? "warn" : "fail",
    detail: robots.ok
      ? "存在"
      : robots.status === 404
        ? "缺失 (404)"
        : `拉取失败 (${robots.status})`,
    evidence: robots.ok ? robots.text.slice(0, 2000) : robots.error || "",
  });

  // sitemap.xml（robots 里声明或默认路径）
  const sitemapFromRobots = /sitemap:\s*(\S+)/i.exec(robots.text || "")?.[1];
  const sitemap = await fetchText(sitemapFromRobots || `${base}/sitemap.xml`);
  checks.push({
    name: "sitemap.xml",
    status: sitemap.ok ? "pass" : "warn",
    detail: sitemap.ok ? (sitemapFromRobots ? "robots 已声明" : "默认路径存在") : "未找到",
    evidence: sitemap.ok ? sitemapFromRobots || `${base}/sitemap.xml` : "",
  });

  // llms.txt
  const llms = await fetchText(`${base}/llms.txt`);
  checks.push({
    name: "llms.txt",
    status: llms.ok ? "pass" : "info",
    detail: llms.ok ? "存在" : "缺失（非强制，但利于 AI 导航）",
    evidence: llms.ok ? llms.text.slice(0, 1000) : "",
  });

  // ai_crawler_access：从 robots 判各类 AI bot 是否被挡
  const citationBlocked = CITATION_BOTS.filter((b) => isBlocked(robotsGroups, b));
  const trainingBlocked = TRAINING_BOTS.filter((b) => isBlocked(robotsGroups, b));
  const allBlocked = robotsGroups.some(
    (g) => g.agents.includes("*") && g.disallow.includes("/") && !g.allow.length,
  )
    ? ["*"]
    : [];
  checks.push({
    name: "ai_crawler_access",
    status: citationBlocked.length ? "fail" : trainingBlocked.length ? "warn" : "pass",
    detail: citationBlocked.length
      ? `引用型爬虫被挡: ${citationBlocked.join(", ")}`
      : trainingBlocked.length
        ? `训练型爬虫被挡: ${trainingBlocked.join(", ")}`
        : "主流 AI 爬虫可访问",
    evidence: JSON.stringify({
      citation_blocked: citationBlocked,
      training_only_blocked: trainingBlocked,
      all_blocked: allBlocked,
    }),
  });

  return checks;
}

async function cliMain() {
  const [origin] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!origin) {
    console.error("Usage: node geo-site-checks.mjs https://example.com [--json]");
    process.exit(2);
  }
  const checks = await siteChecks(origin);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(checks, null, 2));
  } else {
    for (const c of checks) console.log(`[${c.status.toUpperCase()}] ${c.name} — ${c.detail}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
