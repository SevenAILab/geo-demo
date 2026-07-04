# geo-brand-story 落地实现 · 结合 geo-kit（方案 + 路演 + 开发底稿）

> 2026-07-04 ｜ 一份文档说清三件事：**这块能力对外怎么讲（路演）、现在长什么样（现状）、结合 geo-kit 怎么开发（落地）。**
> 关系：本文是品牌事实提炼能力的**唯一权威文档**（已合并早期的 `brand-facts-extraction` 方案稿）。贴本仓库真实存在的 `skills/geo-brand-story` 技能来写，路径均已核实；冲突以真实代码为准。
> 术语：`geo-kit` = 本仓库 `geo-scoring-kit/`（可迁移的评分+方法论包）；`geo-brand-story` = `skills/geo-brand-story/`（跑在 openclaw agent 上的 prompt 技能）。

---

## §0 · 路演一页纸（先讲这个）

- **痛点**：GEO 体检只回答"你哪里差"（缺 FAQ、缺 Organization schema、可引用性低……），但下一步"内容生成 + 技术修复"需要知道"你是谁"——名称、行业、价值主张、受众、差异化、竞品。这六件事今天靠人工填表，慢、主观、还容易把"品牌自吹"当事实写上页。
- **方案**：在体检和修复之间加一层**品牌事实提炼**（`geo-brand-story`）——从①站点内容 + ②体检缺口，自动产出**可执行、可核验**的品牌事实，直接喂给内容生成（`geo-content`）和技术修复（`geo-fixpack`）。
- **差异化（记忆点）**：**我们不是"抓取网站"，是"给网站跑一遍策略咨询的脑子"**。提炼引擎的判据直接搬专业策略方法论——自身分析的"真优势 = 用户认 × 竞品无 × 壁垒强"、用户洞察的"看行为不看说"。产出的是**判定过的事实**，不是**照抄的自我介绍**。
- **诚实**：官网自吹的话标成"待确认"，只有找到佐证才当真——所以后面自动生成的内容与修复站得住脚，而不是把广告词又抄了一遍。

---

## §1 · 现状速览（它在链条哪一站）

geo 技能是一条 5 环链，全是 prompt 级 `SKILL.md`，由 `ui/src/ui/geo-skill-runner.ts` 经 openclaw agent 跑：

```
assessment ──→ brand-story ──→ ┬─ content     （四大修复卡）
（体检报告）   （品牌事实·本文）  ├─ fixpack     （JSON-LD + llms.txt）
                                └─ monitoring  （监测面板）
```

- **brand-story 输入**：`siteUrl` + 上一轮 `assessmentReport`（totalScore/gaps/metrics/summary）。
- **brand-story 输出**：一个 ```json 块 → `parseGeoBrandStoryJson()`解析成`GeoBrandStory` 类型。
- **谁消费**：content / fixpack / monitoring 三个下游都把 `brandStory` JSON 拼进各自 prompt（见 `buildGeoSkillPrompt` + i18n `contentPrompt/fixpackPrompt/monitoringPrompt`）。

---

## §2 · 现有实现盘点（文件级）

| 环节      | 真实位置                                                                                                     | 现状                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 技能契约  | `skills/geo-brand-story/SKILL.md`                                                                            | 输出 schema + 质量门齐全；已写"真优势需可验证：用户认 × 竞品无 × 可结构化表达" |
| 字段纪律  | `skills/geo-brand-story/references/brand-facts.md`                                                           | **仅 ~10 行**：从 title/meta/H1/about 抽 6 字段，粒度浅                        |
| 缺口映射  | `skills/geo-brand-story/references/gap-to-story.md`                                                          | gap 类型 → 应补字段的对照表，已可用                                            |
| 调度      | `ui/src/ui/geo-skill-runner.ts`（`GEO_SKILL_PATHS.brandStory`、`buildGeoSkillPrompt`）                       | 已接入 5 环链                                                                  |
| 提示词    | `ui/src/i18n/locales/en.ts` `geo.skills.brandStoryPrompt`                                                    | 让模型"读技能+references→提炼→末尾输出唯一 JSON 块"                            |
| 解析/兜底 | `ui/src/ui/geo-parsers.ts`（`parseGeoBrandStoryJson`/`resolveValuePropLabels`/`deriveBrandNameFromSiteUrl`） | 有容错与品牌名兜底                                                             |
| 类型      | `ui/src/ui/geo-parsers.ts` `GeoBrandStory`                                                                   | UI 契约**已固定**（改契约要动 UI/解析/i18n）                                   |

---

## §3 · 提炼什么 —— 六类品牌事实 × 方法论 × 数据源

| 品牌事实（`GeoBrandStory` 字段）             | 提炼判据（借哪套方法论）                             | 主要数据源                                       | 谁消费               |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | -------------------- |
| **名称 `brandName`**                         | 直取，不判定（法定/产品名，非域名）                  | JSON-LD `Organization.name`、`<title>`、og:title | fixpack（schema）    |
| **行业 `industry`**                          | industry-analysis：细分品类，非泛 SaaS               | 正文 + schema `@type` + 外部搜证                 | content + fixpack    |
| **价值主张 `valuePropOptions`/`valueProps`** | **self-analysis**：你凭什么赢（入场券）              | 首屏/首段原文、meta_description、承重页          | content（定义块）    |
| **受众 `audience`/`aiPreview.audience`**     | **user-insight**：定用户、看行为不看说、不用宽泛标签 | 场景描述 + 复用 `query_set` 反推                 | content（问句/FAQ）  |
| **差异化 `differentiator`**                  | **self-analysis**：真优势 = 用户认 × 竞品无 × 壁垒强 | 站点自述 × 竞品对比 × 外部证据                   | content（vs 对比表） |
| **竞品 `competitors`**                       | competitor-analysis：五类竞品范围                    | 用户填/对比页/外部搜证                           | content（引用竞争）  |

> 名称/竞品偏"取值"，价值主张/受众/差异化偏"判定"——后三类是方法论真正发力、也是最容易踩幻觉坑的地方（见 §7）。

---

## §4 · 核心差距（要开发补的）

1. **方法论"说了没落地"**：SKILL 声称"借鉴自身分析与用户洞察方法论"，但真正的深度在 geo-kit：
   - `geo-scoring-kit/skills/self-analysis/`（真优势 = 用户认 × 竞品无 × 壁垒强；剔除伪优势）
   - `geo-scoring-kit/skills/user-insight/`（定用户 / 看行为不看说 / 合成洞察标 hypothesis）
     现在 `brand-facts.md` 只有 10 行、没把这些纪律蒸馏进来。
2. **无证据/无置信度**：`GeoBrandStory` 是平铺事实，不带出处/置信度。而 geo-kit 有整套现成能力：`source-tiers.mjs`（T1–T4 分级）、分析卡契约（claim/evidence/source/source_tier/confidence）、`check_analysis_cards.py`（质量门）。
3. **无交叉验证**：differentiator/valueProp 目前只来自站点自述（agent 现场抓站），没跟竞品/外部证据对过——即"自报特质"，未过"真优势"三关。

---

## §5 · 开发思路（结合 geo-kit，分三阶段）

> 原则：**先零架构改动榨干 prompt/references（Phase 1），再谈接管线（Phase 2/3）**。UI 契约 `GeoBrandStory` 尽量不动。三步各自可独立上线、独立验收，风险从低到高。

### Phase 1 · 方法论加固（只改技能文本，零架构改动）

- **做什么**：把 geo-kit 两个 skill 的核心纪律**蒸馏**进 `skills/geo-brand-story/references/brand-facts.md`：
  - 价值主张/差异化：套 self-analysis 的"真优势三关"——每条 `valuePropOption.label` 背后要能自答"用户认不认 / 竞品有没有 / 能不能结构化表达"，答不齐的降级为候选（`suggested:false`）。
  - 受众：套 user-insight——从"谁痛感最强 / 付费意愿最高"出发，禁"25-35 岁白领"式宽泛标签；无真实用户证据的画像视为假设。
- **复用 geo-kit**：`self-analysis/references/real-vs-fake-advantage.md`、`user-insight/references/define-and-validate.md` 的判据摘要成 3–5 条硬规则。
- **验收**：同一站点跑前后对比，`valuePropOptions` 从"自我介绍式"变成"买家问 AI'这行谁最好'时凭什么被推荐"。

### Phase 2 · 证据与置信（轻量校验，不破 UI 契约）

- **做什么**：给提炼加"置信度"而**不改** `GeoBrandStory` 外形——用现有 `suggested` 位表达：**仅站点自述 → `suggested:false`（UI 归入"待用户确认"）；有站点结构化佐证（JSON-LD/多页一致）→ 可 `suggested:true`**。
- **加一道质量门**：借 `geo-scoring-kit/skills/*/scripts/check_analysis_cards.py` 的思路，写一个 brand-story 版校验（runner 侧或产物后跑）：非空 claim/differentiator、competitors 1–3、valuePropOptions 2–6、每条价值主张须能映射回站点可见内容。FAIL 打回重生成。
- **复用 geo-kit**：`source-tiers.mjs` 的 `classifySource` 给"竞品/外部提到"的来源打 T1–T4，作为 `suggested` 升降依据。

### Phase 3 · 交叉验证（接 geo-kit 搜证/竞品能力，真优势转正）

- **做什么**：把 differentiator/valueProp 从"站点自述"升级为"验证过的真优势"——
  - 竞品无：用 assessment 已产出的/用户填的 `competitors`，比对差异点是否竞品也有；
  - 用户认 / 壁垒强：用 geo-kit `research-worker.mjs` + `web-search.mjs` 找外部佐证。
- **落点**：作为 brand-story 生成前的"预研"步骤，或生成后的一次"核验"步骤（agent 多轮）。有外部 T1/T2 佐证的差异化才允许标 `suggested:true` 并交给 content/fixpack 当承重内容。
- **复用 geo-kit**：`research-worker.mjs`（`deriveResearchQuestionsLLM/buildResearchPrompt/tagSources`）、`web-search.mjs`（带缓存+审计）、`cross-model-validate.mjs`（多模型底座）。

---

## §6 · geo-kit 复用映射表

| 要补的能力                    | 用 geo-kit 哪块                                                 | 用在 brand-story 哪一步          |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------- |
| 真优势判据（价值主张/差异化） | `skills/self-analysis` + `references/real-vs-fake-advantage.md` | Phase 1 references 蒸馏          |
| 受众洞察纪律                  | `skills/user-insight` + `references/define-and-validate.md`     | Phase 1 references 蒸馏          |
| 证据分级 T1–T4                | `scripts/source-tiers.mjs` `classifySource`                     | Phase 2/3 定 `suggested`、承重闸 |
| 输出质量门                    | `skills/*/scripts/check_analysis_cards.py`（思路）              | Phase 2 brand-story 版校验       |
| 外部搜证                      | `scripts/research-worker.mjs` + `scripts/web-search.mjs`        | Phase 3 交叉验证                 |
| 多模型底座                    | `scripts/cross-model-validate.mjs` + `llm-clients/*`            | agent 已间接用；Phase 3 可显式调 |
| 体检缺口输入                  | assessment 报告的 `gaps/metrics/summary`（已建）                | 已用（`gap-to-story.md` 映射）   |

---

## §7 · 防幻觉红线（评审必看）

1. **自述 ≠ 真优势**：仅站点来源的差异化/价值主张一律 `suggested:false`（UI 标"待确认"），不得当承重内容直接下发给 content/fixpack；过 Phase 3 三关才转正。**这一步不是可选项。**
2. **只描述可见事实**：与 `geo-fixpack`"只描述页面可见事实、不编造数据"一致——brand-story 每条事实须能映射回站点原文/体检缺口，映射不上则丢弃。
3. **合成必标假设**：无外部证据的受众/洞察按 user-insight 纪律视为假设，不冒充已验证结论。

---

## §8 · 一段话开发思路（给评审）

geo-brand-story 现在是"能跑通、但方法论只停在口号"的技能。开发分三步走：**先把 geo-kit 里 self-analysis / user-insight 的判据蒸馏进它的 references，让提炼有章法（零架构改动、当天见效）；再借 geo-kit 的 source-tiers 与卡片质量门给事实加上"置信度"，用现有 `suggested` 位在 UI 上区分"AI 建议"与"待你确认"；最后接 geo-kit 的 web-search / research-worker，把差异化从"官网自吹"升级成"竞品无、外部可佐证"的真优势才敢下发。** 三步各自独立上线、独立验收，风险从低到高，UI 契约全程不动。

**下一步（建议先做 Phase 1）**：扩写 `skills/geo-brand-story/references/brand-facts.md`，把 `geo-scoring-kit/skills/self-analysis`、`user-insight` 的核心判据摘成硬规则；同步在 `brandStoryPrompt` 里加一句"每条价值主张须能自答用户认/竞品无/可结构化表达"。不改类型、不改解析、不改 UI。

---

## §9 · 路演话术（给非技术听众）

> 把它想成给企业官网请了一位**又快又便宜的策略顾问**。
> 顾问上门第一件事不是动手改，而是先搞清三件事：**你是谁、你凭什么赢、你的人在哪**。
> 我们的系统就是把这套"顾问的脑子"做成了软件——它读你的官网、看体检报告，自动整理出**名称、行业、卖点、受众、差异化、对手**这些品牌事实，每一条都尽量附上依据。
> 关键是它**诚实**：官网自吹的话，它标成"待核实"，只有找到外部佐证才敢当真——所以后面自动生成的内容和修复站得住脚，而不是把广告词又抄了一遍。
> 有了这些事实，后面的"写内容、修技术"才有的放矢——这就是从"知道哪里差"到"知道怎么补"的那一步。
