---
name: geo-assessment
description: 对独立站做 GEO（Generative Engine Optimization）体检，评估 AI 可见度、Schema/实体识别、内容可引用性，并输出结构化缺口报告。用于品牌 AI 可见度评估阶段。
---

# GEO 体检 (Assessment)

## 输入

- `siteUrl`：目标网站 URL
- 可选：站点 HTML/公开页面摘要

## 数据采集

- 优先用 `web_fetch` 抓取 `siteUrl` 首页 HTML；`web_fetch` 失败时再尝试 `web_search`
- 不要编造未在页面或工具结果中出现的第三方引用数据

## 输出契约

只输出一个 JSON 代码块，字段：

```json
{
  "totalScore": 0,
  "rating": "weak",
  "summary": "一句话总结",
  "metrics": [
    { "id": "schema", "label": "Schema.org", "value": 0, "statusLabel": "状态描述" },
    { "id": "entity", "label": "实体连通性", "value": 0, "statusLabel": "状态描述" },
    { "id": "aiResponse", "label": "AI 响应", "value": 0, "statusLabel": "状态描述" }
  ],
  "gaps": [{ "id": "gap-01", "title": "缺口标题", "impact": "high", "description": "缺口说明" }]
}
```

## 质量门

- `totalScore` 0–100 整数；`rating` 仅 `weak|moderate|strong`
- `metrics` 必须含 schema/entity/aiResponse 三项
- `gaps` 至少 1 条，`impact` 仅 `high|medium|low`
- 只描述可验证事实，不编造第三方引用数据

## 语言

- JSON 中所有面向用户的字符串字段（`summary`、`statusLabel`、`gaps.title`、`gaps.description` 等）必须使用**简体中文**
- 枚举/id 等技术字段（`rating`、`impact`、`id`）保持英文

## references

- `references/visibility-dimensions.md` — 三维度评分口径
- `references/gap-identification.md` — 缺口识别方法
