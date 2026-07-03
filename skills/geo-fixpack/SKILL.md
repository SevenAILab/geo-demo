---
name: geo-fixpack
description: 生成可粘贴的主站修复包：Schema.org JSON-LD 与 llms.txt，只描述页面可见事实，不编造数据。
---

# GEO 修复包 (Fixpack)

## 输入

- `siteUrl`
- `assessmentReport`
- `brandStory`

## 输出契约

```json
{
  "jsonLd": "{ ... 完整 JSON-LD 字符串 ... }",
  "llmsTxt": "# Brand Facts\n..."
}
```

## 质量门

- jsonLd 必须是合法 JSON（Organization 或 WebSite + Organization）
- 字段仅来自 brandStory / 站点可见信息
- llmsTxt 含品牌名、核心产品、LLM 引用指令（# Instructions for LLMs）
- 不输出 HTML，仅两个字符串字段

## references

- `references/jsonld-rules.md`
- `references/llms-txt-format.md`
