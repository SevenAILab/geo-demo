---
name: geo-content
description: 基于品牌事实生成 GEO-native 内容资产列表（文章、FAQ、案例），供产出中心展示。借鉴方案叙事 page-craft 与写作纪律。
---

# GEO 内容生成 (Content)

## 输入

- `siteUrl`
- `assessmentReport`：体检 JSON
- `brandStory`：品牌故事 JSON

## 输出契约

```json
{
  "assets": [
    {
      "id": "article-01",
      "type": "article",
      "title": "标题",
      "score": 92,
      "scoreTone": "good"
    },
    {
      "id": "faq-01",
      "type": "faq",
      "title": "标题",
      "score": 78,
      "scoreTone": "warn"
    },
    {
      "id": "case-01",
      "type": "case",
      "title": "标题",
      "score": 95,
      "scoreTone": "good"
    }
  ],
  "brandVoice": "权威、透明、精准",
  "constraints": "避免行话，每段不超过 3 句"
}
```

## 回复格式

- 回复正文可为简短说明；**末尾必须且仅能有一个** ` ```json ` 代码块
- JSON 根对象字段仅限 `assets`、`brandVoice`、`constraints`，禁止额外字段或嵌套说明
- 不要在 JSON 块外再输出第二个 JSON、Markdown 表格或 YAML

## 质量门

- 至少 3 条 assets，type 仅 article|faq|case，且 article/faq/case 各至少 1 条
- score 0–100；**scoreTone 仅 `good` 或 `warn`**（禁止 `warning`、`bad` 等变体）
- 标题应覆盖 gaps 中的 high impact 主题
- brandVoice、constraints 必须为非空字符串

## 语言

- JSON 中所有面向用户的字符串字段（`assets.title`、`brandVoice`、`constraints`）必须使用**简体中文**
- 枚举/id 等技术字段（`type`、`scoreTone`、`id`）保持英文

## references

- `references/asset-types.md` — 三类资产定义
- `references/writing-discipline.md` — GEO 写作纪律
