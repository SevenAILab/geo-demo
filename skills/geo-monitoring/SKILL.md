---
name: geo-monitoring
description: 生成 GEO 监测面板数据：六维准备度分数、推荐选题、最近发布摘要、文章预览。用于修复后追踪 AI 可见度。
---

# GEO 监测 (Monitoring)

## 输入

- `siteUrl`
- `assessmentReport`（体检 JSON，含 totalScore、gaps、metrics）
- `brandStory`（品牌名、竞品、差异化、受众）
- 可选：`repairPack`（jsonLd + llmsTxt，表示已生成的修复包）

## 评分步骤

1. 阅读 `references/dimensions.md` 理解六维含义
2. 阅读 `references/scores.json` 中的评分模板，**按 assessmentReport.gaps 与 metrics 为每个维度推导 baseline**
3. 若 repairPack 已提供（非空 jsonLd/llmsTxt），对 schema、llms、entity 维度上调（通常 +15~40），并在 readinessDelta 中说明修复包贡献
4. 各维 `value` 0–100，`tone` 映射：≥80 good，50–79 purple，<50 warn
5. `readinessScore` = 六维 value 的算术平均值（四舍五入取整）
6. `readinessDelta` = 相对 assessmentReport.totalScore 的差值，格式如 `+6（修复包部署后提升，主要受限于…）`，必须简体中文

## 内容生成

- `topics` 至少 2 条，必须结合 brandStory 品牌名、竞品、差异化与 assessment gaps
- `recentPublishes` 3–4 条，模拟该品牌近期 GEO 内容发布（简体中文标题与时间）
- `articlePreview` 为 topics 中一条 insight/deep 选题的 Markdown 正文预览，引用真实品牌与竞品，禁止 Acme/BrandGEO 等占位

## 输出契约

在回复末尾输出**唯一一个** JSON 代码块。**无需写入文件**。

```json
{
  "readinessScore": 82,
  "readinessDelta": "+4（由修复包贡献）",
  "dimensions": [{ "id": "schema", "label": "Schema.org 标记", "value": 95, "tone": "good" }],
  "topics": [{ "id": "t1", "title": "选题标题", "tag": "missing", "action": "comparison" }],
  "recentPublishes": [{ "title": "文章标题", "ago": "2 天前" }],
  "articlePreview": "预览正文 Markdown 纯文本"
}
```

## 质量门

- dimensions 恰好 6 项：schema, llms, entity, answer, search, trust（顺序不限）
- tone 仅 good|purple|warn
- topics 至少 2 条；tag 仅 missing|insight；action 仅 comparison|deep
- readinessScore 0–100

## 语言

- JSON 中所有面向用户的字符串字段（`dimensions.label`、`topics.title`、`recentPublishes.title`/`ago`、`articlePreview`、`readinessDelta`）必须使用**简体中文**
- 枚举/id 等技术字段（`tone`、`tag`、`action`、`id`）保持英文

## references

- `references/dimensions.md` — 六维定义
- `references/scores.json` — 评分模板（按 gaps 动态填 baseline）
- `references/example-output.json` — 输出契约示例（非运行时数据）
