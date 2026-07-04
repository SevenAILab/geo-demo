# 拼装手册 · 每一块用什么拼（技术人员唯一速查表）

> 2026-07-03 ｜ 回答一个问题："**做 X 的时候，具体用仓库里/开源里的哪个东西？**"
> 与其他文档的关系：v2 spec 说"做什么"，plan-v2 说"怎么施工"，**本手册说"零件在哪、怎么接线"**。冲突时以真实代码为准。
> 所有路径都是 pptmaster 仓库内路径；外部资产已物理落位（见 §9），不需要再去别的仓库找。

---

## §0 · 总装配图（流水线每一站用什么）

```
S0 输入URL → [体检] scorer/auditUrl(已建成✅) + report-mapper(M8新建)
                │
S1 报告页   ← 报告JSON + gap-copy.zh.json(Seven供稿) + AI眼(signals正文) + 校准种子
                │ "修复"CTA
S2 摄取确认 → [爬站] ingest/url-to-materials(N1新建: article-extractor)
              [自动填] agents/intake-agent/material-front-door.mjs(已建成✅)
              [缺口出题] assets/intake/question-map.json(已建成✅) → 表单+选项chips
                │ confirm
worker 流水线 → [分析] agents/research-agent/citation-competition(N2新建,骨架=skills/competitor-analysis)
              → [生成] scripts/generate-brand-modules.mjs(已建成✅,方法论=skills/四维+brandhouse-rules)
              → [渲染] site-generator/(M2新建: Node模板+jsonld+llmstxt.org格式)
                │
S4 发布     → app/s/路由+middleware(M4新建,抄vercel/platforms模式) → view_logs(scorer/crawler-classifier✅+vendor/ai-robots-txt/robots.json✅+isbot)
S5 面板     → 分数史(audits表) + 爬虫命中(Cloudflare口径) + 文章闭环(vendor/seo-geo-ops/quality_check.py✅)
```

---

## §1 · S0/S1 体检页：每个部件的零件来源

| 部件                       | 怎么做                                                                                                                                                                 | 用什么（精确到文件）                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| URL 识别/规范化            | **纯工程自建 ~30 行，不用任何 skill**：trim → 无协议补 `https://` → `new URL()` 解析校验 → 拒绝内网（localhost/127./10./172.16-31./192.168./169.254.）→ 拒绝非 http(s) | 新建 `app/lib/normalize-url.js` + 单测（plan v2-M9 步骤 2）                                                                                                              |
| 体检本体                   | 一行调用，**已建成**                                                                                                                                                   | `scorer/index.mjs` 的 `auditUrl(url)`——内部自动抓 页面+robots+sitemap+llms.txt 四件并打分                                                                                |
| 报告映射（三层/闸门/人话） | M3 原始输出 → 报告 JSON。闸门=`signals.is_spa_shell` 或 `crawler_posture==='citation_blocked'` → 总分封顶 30                                                           | 新建 `scorer/report-mapper.mjs`（plan v2-M8 §2 有完整 JSON 契约）                                                                                                        |
| 缺口人话文案               | 查表：`dimension+issue` → 中文品牌语言。**查不到就抛错**（暴露文案没写全）                                                                                             | 新建 `scorer/gap-copy.zh.json`，内容 Seven 供稿；gaps 的 issue 枚举就在 `scorer/score-readiness.mjs` L67-72（今天就 6 条，好写全）                                       |
| 人眼 vs AI 眼              | 右屏=体检时抓到的正文文本（等宽字体直接展示，SPA 站会接近空白=正确效果）；左屏=`public/demo-shots/{hostname}.png` 预截图 → 没有则调 Microlink                          | 右屏数据源：`auditUrl` 返回的 `signals`（extract-signals 抽的）；左屏：`GET https://api.microlink.io/?url=...&screenshot=true` 取 `data.screenshot.url`（免费 50 张/天） |
| 校准种子                   | 预跑 3-5 个知名站存库，报告页/落地页展示"标尺对所有人一样"                                                                                                             | 新建 `scripts/seed-benchmarks.mjs` 串行调 auditUrl+mapper 写 audits(is_benchmark=true)；站单：stripe.com、vercel.com、一个纯 SPA 产品站、sevenailab.com(63/D 已实测)     |

## §2 · S2 摄取&确认：形态拍板 + 数据流

**拍板：表单 + 选项 chips，不做 LLM 对话。** 理由：①两次调用架构已定（V2/V7），有状态对话 API 已砍；②**选项化的题目你们已经有了**——`assets/intake/question-map.json` 每道题自带 `oblique_prompt`（题干）、`options_or_examples`（选项 chips）、`follow_ups`（追问，放 placeholder）、`sufficiency_weight`（权重）。前端只是把 JSON 渲染成表单，零发明。

**页面结构（上下两半）**：

1. **上半 · 自动填充区**：每个字段一行 = 值（可编辑 input）+ 来源角标（"来自你的官网 /about"或"来自上传资料"）+ 置信标记（assumptions 里的条目标"待确认"黄色）。
2. **下半 · 缺口问题区（≤5 题）**：每题 = question-map 的 `oblique_prompt` 做题干 + `options_or_examples` 渲染成单选 chips + "其他"自由输入框。
3. 侧栏：竞品 URL 输入（1-3 个，可跳过）+ 补充资料粘贴框 + site_language 选择（中/英）。

**数据流（"筛选出方法论里没有的再问用户"具体是哪个组件）**：

```
用户URL → ingest/url-to-materials.mjs(N1新建)
           用 @extractus/article-extractor 的 extractFromHtml 抽 ≤5 页正文
           （JS站兜底: fetch('https://r.jina.ai/'+url)）
        → agents/intake-agent/material-front-door.mjs 的 analyzeMaterials()   ★就是这个，已建成有测试
           提示词写死"只抽取素材明确提到的字段，不要猜测" → 返回 {covered, assumptions}
        → gapsAfterMaterials({covered, allFields})                            ★同文件
           allFields 权威来源 = agents/intake-agent/output-contract.mjs 的
           REQUIRED_BRIEF_FIELDS(industry/target_audience/competitors/capabilities) + brandHouse.mission
        → 缺的字段按 dimensions 匹配 question-map 里的题 → 前端渲染成表单
```

**一句话**：不需要新 skill——"先分析资料、缺啥问啥"就是 pptmaster 自己的 intake-agent，你们上个月已经建好并测过了，现在只是给它接一个"吃网址"的嘴（N1）和一个表单皮肤（S2）。

## §3 · 评分细则全表（"内容分 65 具体怎么评"）

**规则不在任何 skill 里，就在代码里**：`scorer/score-readiness.mjs`（75 行，移植自 seo-geo-ops 的 score_geo_seo.py 实测权重）。六类各自内部按百分制打，再按权重合成总分：

**技术侧（合计权重 35）**
| 类（权重） | 内部计分（满 100） |
|---|---|
| technical_foundation (15) | SPA 空壳直接=10 分；否则基础 40 + canonical 15 + robots 可达 15 + sitemap 10 + llms.txt(≥80词) 10 + 引用类爬虫未被封 10 |
| metadata_social (10) | title 30 + meta description 30 + H1 20 + OG 标签 20 |
| structured_data (10) | 无 JSON-LD = 0；有则 40 + 每覆盖一个关键类型 +12（Organization/WebSite/Service/Product/FAQPage/Article/BreadcrumbList）+ hreflang 10 |

**内容侧（合计权重 65）——这就是"品牌方法论穿上分数外衣"的部分**
| 类（权重） | 内部计分（满 100） | 对应品牌方法论概念 |
|---|---|---|
| ai_citability (25) | **开头定义块 25**（"X 是那个[品类]中[差异点]的…"）+ FAQ 区 20 + 疑问式标题 ≥3 得 15（≥1 得 8）+ 对比表 15 + 表格 10 + 列表 10 + 首段 18-80 词 5 | 定位陈述 / 买家问答 / vs 凑合方案 |
| content_depth (20) | 词数/600×40（封顶 40）+ 疑问标题×7（封顶 20）+ 表格 20 + 列表 20 | 内容厚度 / 答案覆盖 |
| authority_freshness (20) | 作者署名 30 + 更新时间 30 + 外链×13（封顶 40） | 信任状 / 证据来源 |

等级线：A≥85 / B≥75 / C≥65 / D≥50 / F。缺口(gaps)的 6 个枚举和车道(lane)也在同文件 L67-72。
**LLM 主观维**（yao 8 维语义质量）**不进免费体检**（V4 成本红线），只在付费流水线里给文章打分用——模板在 Princeton 仓库 `geval_prompts/`（见 §8）。
展示层三层聚合（闸门/技术 35/内容 65）是 report-mapper 的映射，**不改这个文件**。

## §4 · 修复的种类（一共 4 类 + 1 类不做）

| #   | 修复类                               | 治什么缺口(lane)                                    | 用什么生成                                                                                                                                                                         | 交付到哪                                                          |
| --- | ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | **技术基建修复**                     | repo_fix：缺 JSON-LD/llms.txt/robots 封禁/canonical | `site-generator/jsonld.mjs` 构造器 + `root-files.mjs`（llms.txt 按 llmstxt.org 格式：H1+blockquote+H2 链接列表）                                                                   | **修复包**（fix-pack 页可粘贴代码块，给用户主站）+ 枢纽站原生内建 |
| 2   | **品牌内容修复**                     | geo_upgrade：缺定义块/差异化主张/信任状             | `scripts/generate-brand-modules.mjs` + `brandhouse-rules/node-rules`（Seven 方法论引擎）；表达层可调 marketingskills（copywriting/positioning）                                    | 枢纽站正文 + 修复包 copy_rewrites                                 |
| 3   | **结构呈现修复**                     | 缺 FAQ 结构/对比表/答案块/语义 HTML                 | `site-generator/templates/pages.mjs` 模板硬规格（每页必含定义块/对比表/FAQ——plan v2-M2 §3 那张表就是照评分表反着写的）                                                             | 枢纽站页面结构                                                    |
| 4   | **持续内容修复（文章类）**           | 买家问句覆盖不足/内容深度不够                       | 选题：`content/suggest-topics.mjs`（纯规则：缺口→题型映射）；生成：GEOFlow EN/ZH 提示词 + **Princeton 9 手法**（引语+41%/统计+33%）；质检：`vendor/seo-geo-ops/quality_check.py`✅ | 枢纽 blog（发一篇→重测→跳分）                                     |
| —   | 站外信号（第三方评价/社媒/Wikidata） | authority 的外链项                                  | **MVP 不做**，报告里标"站外项"即可                                                                                                                                                 | 路线图                                                            |

## §5 · 枢纽渲染（M2）零件表

| 零件                       | 来源                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 页面信息架构（哪页放什么） | plan v2-M2 §3 硬规格表（= 评分表反写）；深层参考 yao `yao-geo-page-blueprint`（16 段 IA，见 §9 怎么拿 yao）                               |
| JSON-LD 字段结构           | 自建 `jsonld.mjs` 纯函数；红线="只描述正文可见事实"（yao Schema 合同）                                                                    |
| llms.txt 格式              | llmstxt.org 规范：H1 站名(必需)+blockquote 摘要+H2 分节链接；20 行模板字符串                                                              |
| 内容来源                   | `schemas/brand-system-content.schema.json` 的字段（strategic_spine/brand_house/qa_pairs/entity_links）——**只对接这个 JSON，不读引擎内部** |
| 自验收                     | 渲染产物直接喂 `scorer` 的 extractSignals+scoreReadiness，断言 ≥85（生成器写的=评分器检的，同一张表）                                     |

## §6 · 引用竞争分析（N2）零件表

- 新文件 `agents/research-agent/citation-competition.mjs`；**提示词骨架抄 `skills/competitor-analysis/SKILL.md`**（五类竞品范围/事实-动机-效果三层拆解/"借鉴什么规避什么"结论格式），但证据源换成 M8 审计 JSON（用户站+竞品站的真实抓取数据）
- 老四维闸门路径零改动，`analysis_mode` 分流（plan v2-N2 §3 的步骤 0 必须先做：追清生成器吃什么 shape）
- 防幻觉硬规则：user_gaps 必须能映射回输入 userAudit.gaps 的条目，映射不上直接丢弃

## §7 · 追踪与面板零件表

| 零件         | 来源                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UA 识别三层  | ①主表=`scorer/ai-crawlers.json` merge `vendor/ai-robots-txt/robots.json`✅（159 个爬虫，含 operator/respect/function 字段→直接做面板 tooltip）②`isbot` 兜底记 other_bot ③都不中=human |
| 子域名路由   | 抄 `vercel/platforms` 的 middleware 三分支模式（localhost 开发/vercel.app 预览/生产），**读懂自己写**（该仓库无 LICENSE）；域名走 env `ROOT_DOMAIN`                                   |
| 面板指标口径 | 抄 Cloudflare AI Insights 公开口径：training / search / **user_action** 三分类 + crawl-to-refer 比——不自造名词                                                                        |
| 日志写入     | route handler 里 fire-and-forget insert view_logs，**绝不阻塞响应**                                                                                                                   |

## §8 · 文章闭环零件表

| 零件          | 来源                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 选题          | `content/suggest-topics.mjs` 纯规则：ai_citability/content_depth 高严重度缺口 → 题型（缺对比表→对比文；FAQ 不足→未回答的 qa_pairs 前 3 条）                                                                                                            |
| 生成提示词    | 骨架=GEOFlow EN GEO 提示词要点（E-E-A-T/Key Takeaways/FAQ/禁夸张词）+ **Princeton 9 手法 checklist**（github.com/GEO-optim/GEO 的 `src/geo_functions.py`：加引语/加统计/引可信来源/流畅化为主力四条）+ 写作规范 `vendor/seo-geo-ops/WRITER_GUIDE.md`✅ |
| 质量门        | `vendor/seo-geo-ops/quality_check.py`✅（child_process 调 python3，读 next_action；**只能跑 worker**，serverless 无 python）；二次不过→failJob，不发不合格内容                                                                                         |
| markdown→HTML | `marked.parse()`（零依赖）→ 套 `renderArticle` 模板                                                                                                                                                                                                    |
| 事实红线      | 文章里的数字/案例只准来自 BrandSystemContent 的证据字段，无证据不出现                                                                                                                                                                                  |

## §9 · 外部资产落位表（在哪、怎么拿）

| 资产                                                                      | 状态                | 位置                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| quality_check.py + WRITER_GUIDE                                           | ✅ 已 vendor 进仓库 | `vendor/seo-geo-ops/`                                                                                                                                                   |
| AI 爬虫权威名录 robots.json（159 个）                                     | ✅ 已 vendor 进仓库 | `vendor/ai-robots-txt/robots.json`                                                                                                                                      |
| npm 三件：@extractus/article-extractor / isbot / marked                   | 各自 `npm i` 时装   | package.json（谁的模块谁装，群里喊 Seven 合并）                                                                                                                         |
| 免费 API 两件                                                             | 零安装              | `r.jina.ai/`+URL（正文兜底）；`api.microlink.io`（截图）                                                                                                                |
| yao-geo-skills（page-blueprint IA / intent-miner / 文章方法论等深层参考） | 需要时自取          | `git clone https://github.com/yaojingang/yao-geo-skills`（Seven 本地也有：`/Users/seven/Documents/GEO/yao-geo-skills-main`）；**只读方法论文档，别搬它的 Laravel 代码** |
| Princeton GEO 评测 prompt                                                 | 需要时自取          | `git clone https://github.com/GEO-optim/GEO` → `geval_prompts/`、`src/geo_functions.py`                                                                                 |
| ⚠️ License 红灯                                                           | 禁止抄码            | canonry（FSL 禁竞用）、vercel/platforms（无 LICENSE 只抄思路）、firecrawl（AGPL 不引）                                                                                  |

## §10 · "从何下手"——每人第一小时

- **PM+Codex**：`git pull` → 给 Codex 粘：`读 docs/plans/2026-07-02-plan-v2-M1-api-jobs-worker.md，按施工步骤 TDD 执行，到 CP1 停`。
- **开发 A**：`git pull && npm i` → 跑 `npm run test:mvp` 确认全绿 → 读 plan v2-M2 → 从 `jsonld.mjs` 的第一个测试写起（fixture 用 `outputs/abrandos-final/` 的真实 BrandSystemContent，本地找 Seven 要，或造最小 fixture）。
- **开发 B**：`git pull` → 打开 `scorer/score-readiness.mjs` 读 75 行（评分规则全在这）→ 读 plan v2-M8 → 从 report-mapper 的闸门测试写起。
- **卡壳 30 分钟原则**：任何问题卡超过 30 分钟，群里发"文件路径+想做什么+报错"，Seven 转给 Claude。

---

## 给小白的讲解

- **这份手册解决什么**：团队知道"要做体检页"但不知道"体检逻辑在哪个文件、缺口文案谁写、AI 眼的数据从哪来"——本手册把每个部件的零件来源写到文件路径级。发出去后，"用什么做"这类问题应该归零。
- **三个最重要的澄清**：①S2 不做聊天，做"自动填好的表单+选项题"——选项题库你们早就建好了（question-map.json），前端只是把它画出来；②"内容分 65 怎么评"不在任何神秘 skill 里，就在仓库 `scorer/score-readiness.mjs` 那 75 行代码里，本手册 §3 已翻译成人话表格；③修复一共 4 类（技术补丁/品牌内容/页面结构/持续文章），每类的生成器和交付位置都列了。
- **两个刚放进仓库的零件**：文章质量门脚本和 159 个 AI 爬虫的权威名录，团队 `git pull` 就有，不用再去外面找。
- **怎么验证**：把手册发群里，观察接下来半天"这个用什么做"类提问的数量——归零即成功；没归零的问题发给我，说明手册漏了，我补。
