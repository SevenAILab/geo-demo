---
name: geo-brand-story
description: 从 GEO 体检缺口与站点内容提炼品牌事实（名称、行业、价值主张、受众、差异化、竞品），供内容生成与技术修复使用。借鉴自身分析与用户洞察方法论。
---

# GEO 品牌故事 (Brand Story)

## 输入

- `siteUrl`
- `assessmentReport`：上一轮体检 JSON（totalScore, gaps, metrics, summary）

## 输出契约

```json
{
  "brandName": "品牌名",
  "industry": "所属行业",
  "valueProp": "价值主张（一句话，可执行）",
  "audience": "目标受众",
  "differentiator": "差异化优势（2-3 句）",
  "competitors": ["https://竞品1.com", "https://竞品2.com"],
  "aiPreview": {
    "entity": "实体标签",
    "type": "业务类型",
    "audience": "AI 将识别的受众"
  }
}
```

## 质量门

- 缺口字段（valueProp, differentiator）必须基于 gaps 补全，不可留空占位
- 真优势需可验证：用户认 × 竞品无 × 可结构化表达
- competitors 1–3 个 URL 或空数组

## references

- `references/brand-facts.md` — 字段提取纪律
- `references/gap-to-story.md` — 缺口 → 品牌事实映射
