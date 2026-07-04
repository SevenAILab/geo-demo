#!/usr/bin/env node
// geo-probe.mjs — 跑 query_set × 模型 × R → 产出 SPEC §1 的 probe_runs[]
// 复用 cross-model-validate.mjs 的 MODEL_REGISTRY（claude/gpt-4o/qwen/deepseek）。
// 每条记录: { q, model, run, mentioned, rank, stance, competitors_hit }
//   competitors_hit: [{ name, rank, stance }] —— 命中竞品也带名次/立场，供行业可见性排名聚合。
// 用法: node geo-probe.mjs --brand "品牌" --queries q.json --competitors c.json \
//        --models claude,gpt-4o --runs 3 --yes-spend [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL_REGISTRY, parseModelList } from "./cross-model-validate.mjs";

const PROBE_SYSTEM = [
  "你是一个搜索/推荐场景的回答器。针对用户提问，像面向真实消费者那样，给出你会推荐的品牌清单（按推荐优先级排序）。",
  "只输出严格 JSON，不要 markdown 围栏，形如：",
  '{"brands":[{"name":"品牌名","stance":"rec|neutral|neg"}]}',
  "stance: rec=明确推荐, neutral=中性提及, neg=负面提及。按你真实的推荐顺序排列 brands。",
].join("\n");

function norm(s) {
  return String(s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "");
}

// 从模型返回文本里解析出品牌清单
function parseBrands(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(m ? m[0] : text);
    return Array.isArray(data.brands) ? data.brands : [];
  } catch {
    return [];
  }
}

// 把一次回答映射成一条 probe_run（本品牌视角）
function scoreAnswer({ q, model, run, brands, brand, competitors }) {
  const brandKey = norm(brand);
  let rank = null;
  let stance = "neutral";
  const competitors_hit = [];
  const seen = new Set();

  brands.forEach((b, i) => {
    const k = norm(b.name);
    const pos = i + 1; // 排序清单里的名次（1-based），本品牌与竞品同一口径
    const st = b.stance || "neutral";
    if (brandKey && (k.includes(brandKey) || brandKey.includes(k))) {
      if (rank == null) {
        rank = pos;
        stance = st;
      }
      return;
    }
    // 竞品也记名次/立场（排序清单已带位置）：首次出现取最好名次，industryRanking 用。
    const hit = competitors.find((c) => {
      const ck = norm(c);
      return ck && (k.includes(ck) || ck.includes(k));
    });
    if (hit && !seen.has(hit)) {
      seen.add(hit);
      competitors_hit.push({ name: hit, rank: pos, stance: st });
    }
  });

  return {
    q,
    model,
    run,
    mentioned: rank != null,
    rank,
    stance: rank != null ? stance : "neutral",
    competitors_hit,
  };
}

export async function probe({
  brand,
  querySet,
  competitors = [],
  models,
  runs = 1,
  dryRun = false,
}) {
  const modelDefs = parseModelList(models).map((k) => {
    const def = MODEL_REGISTRY[k];
    if (!def) throw new Error(`Unknown model key: ${k}`);
    return def;
  });
  if (!dryRun) {
    const missing = modelDefs.filter((m) => !process.env[m.env]).map((m) => m.env);
    if (missing.length)
      throw new Error(`缺少 API key: ${missing.join(", ")}（写入本地 .env，勿提交）`);
  }

  const runsOut = [];
  for (const { q } of querySet) {
    for (const def of modelDefs) {
      for (let r = 1; r <= runs; r++) {
        let brands = [];
        if (dryRun) {
          brands = [
            { name: brand, stance: "rec" },
            ...competitors.slice(0, 2).map((c) => ({ name: c, stance: "neutral" })),
          ];
        } else {
          try {
            const res = await def.fn(PROBE_SYSTEM, q, { model: def.defaultModel, maxTokens: 800 });
            brands = parseBrands(res.text);
          } catch (e) {
            console.error(`  [${def.key}] q="${q}" run ${r} failed: ${e.message}`);
          }
        }
        runsOut.push(scoreAnswer({ q, model: def.key, run: r, brands, brand, competitors }));
      }
    }
  }
  return { probe_runs: runsOut, modelCount: modelDefs.length, R: runs };
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function cliMain() {
  const brand = arg("--brand");
  const queriesPath = arg("--queries");
  if (!brand || !queriesPath) {
    console.error(
      'Usage: node geo-probe.mjs --brand "品牌" --queries q.json [--competitors c.json]',
    );
    console.error("       --models claude,gpt-4o --runs 3 [--yes-spend | --dry-run] [--json]");
    process.exit(2);
  }
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !process.argv.includes("--yes-spend")) {
    throw new Error("真实调用会消耗 API 额度。确认后带 --yes-spend，或用 --dry-run 走离线桩。");
  }
  const result = await probe({
    brand,
    querySet: readJson(queriesPath),
    competitors: arg("--competitors") ? readJson(arg("--competitors")) : [],
    models: arg("--models") || "claude",
    runs: Number(arg("--runs")) || 1,
    dryRun,
  });
  console.log(JSON.stringify(result.probe_runs, null, 2));
  console.error(
    `[probe] modelCount=${result.modelCount} R=${result.R} runs=${result.probe_runs.length}`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
