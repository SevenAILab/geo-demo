---
name: geo-content
description: 基于品牌事实与体检缺口生成 GEO 产出中心四大修复大类卡片数据，供产出中心展示。借鉴方案叙事 page-craft 与写作纪律。
---

# GEO 内容生成 (Content)

## 输入

- `siteUrl`
- `assessmentReport`：体检 JSON
- `brandStory`：品牌故事 JSON

## 输出契约

```json
{
  "categories": [
    {
      "id": "tech-infra",
      "title": "技术基建修复",
      "description": "基于体检缺口生成的修复说明…",
      "impact": "high",
      "tags": ["techInfra"]
    },
    {
      "id": "brand-content",
      "title": "品牌内容修复",
      "description": "…",
      "impact": "medium",
      "tags": ["brandContent", "structure"]
    },
    {
      "id": "structure",
      "title": "结构呈现修复",
      "description": "…",
      "impact": "low",
      "tags": ["structure"]
    },
    {
      "id": "continuous-article",
      "title": "持续文章修复",
      "description": "…",
      "impact": "low",
      "tags": ["continuousArticle", "brandContent"]
    }
  ]
}
```

## 回复格式

- 回复正文可为简短说明；**末尾必须且仅能有一个** ` ```json ` 代码块
- JSON 根对象字段仅限 `categories`，禁止额外字段或嵌套说明
- 不要在 JSON 块外再输出第二个 JSON、Markdown 表格或 YAML

## 质量门

- 恰好 4 条 categories，分别对应：技术基建修复、品牌内容修复、结构呈现修复、持续文章修复
- 每条 `tags` 长度 1–4，tag id 仅 `techInfra|brandContent|structure|continuousArticle`，去重
- `impact` 仅 `high|medium|low`，需结合 assessment gaps 的 impact 合理分配
- `title`、`description` 必须为非空字符串

## 语言

- JSON 中所有面向用户的字符串字段（`title`、`description`）必须使用**简体中文**
- 枚举/id 等技术字段（`impact`、`tags`、`id`）保持英文

## references

- `references/asset-types.md` — 三类资产定义
- `references/writing-discipline.md` — GEO 写作纪律
- `references/category-rules.md` — 四大修复大类生成规则
