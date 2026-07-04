---
name: geo-monitoring
description: 生成 GEO 监测面板数据：六维准备度分数、推荐选题、最近发布摘要、文章预览。用于修复后追踪 AI 可见度。
---

# GEO 监测 (Monitoring)

## 输入

- `siteUrl`
- `assessmentReport`
- `brandStory`
- 可选：`repairPack` 摘要

## 输出契约

```json
{
  "readinessScore": 82,
  "readinessDelta": "+4 (由修复包贡献)",
  "dimensions": [{ "id": "schema", "label": "Schema.org 标记", "value": 95, "tone": "good" }],
  "topics": [{ "id": "t1", "title": "选题标题", "tag": "missing", "action": "comparison" }],
  "recentPublishes": [{ "title": "文章标题", "ago": "2 天前" }],
  "articlePreview": "预览正文 Markdown 纯文本"
}
```

## 质量门

- dimensions 6 项：schema, llms, entity, answer, search, trust
- tone 仅 good|purple|warn
- topics 至少 2 条；tag 仅 missing|insight；action 仅 comparison|deep
- readinessScore 0–100

## 语言

- JSON 中所有面向用户的字符串字段（`dimensions.label`、`topics.title`、`recentPublishes.title`/`ago`、`articlePreview`、`readinessDelta`）必须使用**简体中文**
- 枚举/id 等技术字段（`tone`、`tag`、`action`、`id`）保持英文

## references

- `references/dimensions.md`
