# GEO Scoring Kit · 品牌 GEO 评分迁移包

把品牌 GEO 评分需要的 **评分规范 + 复用代码 + 分析 skills** 打成一个自包含目录，可整体拷进另一个项目。

**评分模型**：两层加权 —— **技术层(代码/工程) × 0.35 + 内容层(品牌内容) × 0.65**。详见 `spec/GEO_SCORING_SPEC.md`。

---

## 目录结构

```
geo-scoring-kit/
├── README.md                     # 本文件：迁移指南 + 清单
├── package.json                  # 依赖（@anthropic-ai/sdk, openai, dotenv, playwright）
├── .env.example                  # 需要的 API key / env 变量
├── spec/
│   └── GEO_SCORING_SPEC.md        # ★ 评分规范（技术层35% + 内容层65%，可直接喂 Claude）
├── scripts/                       # 复用的现成代码（依赖闭包完整，开箱能 import）
│   ├── source-tiers.mjs           # T1–T4 信源分级 → 内容层 source_tier 闸
│   ├── cross-model-validate.mjs   # 多模型调用底座 → 实测层 probe 的基础
│   ├── llm-clients/               # claude / openai+deepseek / qwen 客户端
│   ├── web-search.mjs             # 联网搜证（带缓存+审计）
│   ├── search-cache.mjs
│   ├── research-worker.mjs        # 建 sources.json（项目内 deep-research）
│   ├── ingest-sources.mjs
│   ├── page-inspect.mjs           # playwright 页面检查 → 可扩展成 GEO 爬虫
│   ├── load-env.mjs
│   └── audit-log.mjs
└── skills/                        # 产"评分料"的 4 个分析 skill（含 references/ 与校验脚本）
    ├── user-insight/              # → query_set（实测层 MR 的提问集）
    ├── competitor-analysis/       # → competitors（实测层 SoV 的对手集 + 差异化空位）
    ├── self-analysis/             # → 承重事实（内容层写作素材）
    └── industry-analysis/         # → 品类词/实体（补 MR 缺口）
```

---

## 已包含 vs 还需自建

### ✅ 已包含（拿来即用）

| 类别        | 内容                                                                           |
| ----------- | ------------------------------------------------------------------------------ |
| 评分规范    | `spec/GEO_SCORING_SPEC.md` —— 完整确定性打分规则 + 两层权重 + 红线 + 输出 JSON |
| 复用代码    | 上面 `scripts/` 全部（依赖闭包完整，import 关系已验证不缺文件）                |
| 分析 skills | user-insight / competitor-analysis / self-analysis / industry-analysis         |

### ✅ 已建·评分引擎（`scripts/geo-*` + `geo-lib/`，已按 SPEC 逐条实现并单测）

| 脚本                  | 作用                                                                                  | 依赖             | 复用了本包哪块                                 |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `geo-site-checks.mjs` | 查 robots.txt / sitemap.xml / llms.txt / ai_crawler_access（`citation_blocked` 红线） | 零依赖(纯 fetch) | —                                              |
| `geo-crawl.mjs`       | 爬页面抽 on-page 信号（canonical/meta/schema/word_count/FAQ 块/对比表…）              | playwright       | playwright 底座                                |
| `geo-probe.mjs`       | 跑 `query_set × 模型 × R` → 产 `probe_runs`（提及/排位/立场/竞品命中）                | LLM key          | `cross-model-validate.mjs` 的 `MODEL_REGISTRY` |
| `geo-score.mjs`       | 吃上面信号 → 按 SPEC 输出两层 scorecard JSON                                          | 零依赖(纯函数)   | `geo-lib/*`                                    |
| `geo-lib/*.mjs`       | 规则纯函数：page-type / technical / content / measured / grade                        | 零依赖           | 每模块对应一节 SPEC                            |

> `geo-score.mjs` 是**纯函数**，可脱离爬虫/大模型单测：`fixtures/` 有样本信号，`test/` 有 23 条 `node:test` 断言（含红线、校准、MR/SoV 数值）。跑 `node --test "test/*.test.mjs"`。

#### 本地 5 分钟跑通（技术层，零 key）

```bash
# 1) 站点检查（零依赖）→ checks.json
node scripts/geo-site-checks.mjs https://example.com --json > checks.json

# 2) 爬优先页（需 playwright）→ pages.json
npx playwright install chromium         # 首次
node scripts/geo-crawl.mjs https://example.com/ https://example.com/about --json > pages.json

# 3) 出分（纯函数，零 key）→ scorecard JSON
node scripts/geo-score.mjs --pages pages.json --checks checks.json

# 4)（可选·内容层实测，需 LLM key）先产 probe_runs 再带进来出分
node scripts/geo-probe.mjs --brand "你的品牌" --queries query_set.json \
     --competitors competitors.json --models claude,gpt-4o --runs 3 --yes-spend --json > probe.json
node scripts/geo-score.mjs --pages pages.json --checks checks.json \
     --probe probe.json --queries query_set.json --models 2 --runs 3
```

> 不想跑真实爬虫/模型，直接用样本：`node scripts/geo-score.mjs --pages fixtures/pages.sample.json --checks fixtures/checks.sample.json`。

### ℹ️ 本包未含、但 SPEC 里引用的外部件

- **`deep-research`**：SPEC 第 8 节动作分流用的全局 skill（不在原项目内，是 harness 级 skill）。迁移后如需，用本包的 `research-worker.mjs` + `web-search.mjs` 自建等价流程。
- **`seo-audit` / `geo-content-forge`**：SPEC 第 8 节的执行 agent，原项目也没有，需按 SPEC 第 8 节自建。

---

## 外部依赖

**npm**（见 `package.json`）：`@anthropic-ai/sdk`、`openai`、`dotenv`、`playwright`(dev)。

**env 变量**（见 `.env.example`）：

- 大模型：`ANTHROPIC_API_KEY`（+ 可选 `ANTHROPIC_BASE_URL/MODEL/WIRE_API`）、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`DASHSCOPE_API_KEY`
- 搜证：`EXA_API_KEY`、`SERPER_API_KEY`、`TAVILY_API_KEY`
- 可选：`LLM_RETRY_ATTEMPTS`、`LLM_RETRY_DELAY_MS`

> 只做技术层评分（爬页面 + 站点检查）不需要任何大模型 key；只有内容层的**实测验证(MR/SoV)** 才需要模型 key。

---

## 迁移到新项目

1. **拷目录**：把整个 `geo-scoring-kit/` 复制进目标项目（可留作独立子目录，或把 `scripts/*`、`skills/*` 摊进目标项目对应位置）。
2. **装依赖**：`cd geo-scoring-kit && npm install`（要跑爬虫再 `npx playwright install chromium`）。
3. **配环境**：`cp .env.example .env` 填 key（先只填要用的层）。
4. **验证复用件**：`node -e "import('./scripts/source-tiers.mjs').then(m=>console.log(Object.keys(m)))"` 能打印导出即 import 正常。
5. **按 SPEC 建 4 个脚本**：优先 `geo-site-checks.mjs`(零依赖) 和 `geo-score.mjs`(靠 source-tiers)，可立即跑通技术层；再上 `geo-crawl.mjs`(playwright) 和 `geo-probe.mjs`(靠 cross-model-validate) 补内容层与实测。

### 依赖关系（已验证自包含，无缺失外链）

```
cross-model-validate → llm-clients/{claude,openai,qwen}-client
web-search           → load-env, search-cache, audit-log
research-worker      → source-tiers
source-tiers / search-cache / ingest-sources / page-inspect / load-env / audit-log → 无本地依赖
```

---

## skills 说明

4 个分析 skill 共用一套"分析卡"契约（`claim + evidence + source + source_tier(T1-T4) + implication + confidence`），
天然对齐 GEO 评分：`source_tier` 直接喂内容层信源闸，卡里的可核查事实是内容层写作素材。
每个 skill 目录含 `SKILL.md`、`references/`（方法论细则）、`scripts/check_analysis_cards.py`（契约校验）。
