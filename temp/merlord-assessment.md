# Merlord GEO 体检 - 评估笔记

## 站点基础信息
- **URL**: https://merlord.com
- **行业**: 高端浴室无框玻璃淋浴门（线上直销，美国市场）
- **技术栈**: React SPA (Vite/rolldown), 客户端渲染
- **语言**: 英语
- **支付**: Stripe 托管结账
- **配送**: 美国全国免费配送

## Schema.org 分析
**发现**: ✅ Organization + WebSite JSON-LD 正确嵌入在 `<head>` 中
- Organization: name, url, logo, description, email, telephone, address (locality, region, country), contactPoint 完整
- WebSite: potentialAction (SearchAction) 存在
- ❌ **无 Product schema** — 产品页为 SPA 渲染，静态 HTML 中无结构化数据
- ❌ **无 FAQPage schema** — 尽管有 FAQ 页面
- ❌ **无 Article schema** — 尽管有 8 篇指南文章
- ❌ **无 BreadcrumbList schema**
- ❌ **无 Review/Rating schema**

**评分**: 50/100 — 基础有但严重缺失产品级结构化数据

## 实体连通性分析
**发现**:
- 品牌名 "Merlord" 在 title/meta/schema 中一致出现
- llms.txt 提供了全面的品牌描述、产品线、购买指南
- 有完整联系方式（email, phone, 地址）
- Agent API manifest 提供了机器可读的品牌/产品信息
- ❌ **无 sameAs 社交链接** — 没有指向社媒平台的权威外链
- ❌ **无 Wikipedia 条目或外部权威引用**
- ❌ 无品牌故事/创始人信息在静态 HTML 中

**评分**: 35/100 — llms.txt 和 Agent API 是亮点，但缺少社交图谱和权威引用

## AI 响应分析
**发现**:
- ✅ **llms.txt 非常优秀** — 完整的产品目录、购买指南、API 端点、MCP 安装指令
- ✅ **Agent API 完整** — 产品浏览、报价、设计预览、结账链接
- ✅ **MCP 支持** — Claude Code / OpenClaw 可直接安装
- ✅ 有 8 篇购买指南且内容详实（llms.txt 引用）
- ❌ **SPA 空壳问题严重** — 所有页面静态 HTML 为空白, `#root` 内无内容
- ❌ **无 robots.txt** — 返回 200 但为 SPA shell 而非标准 robots.txt
- ❌ **FAQ 等页面内容不可被 LLM 爬虫读取**
- ❌ **无 FAQPage schema**
- ❌ 关键信息（产品描述、FAQ、文章正文）完全在 JS 渲染后

**评分**: 55/100 — llms.txt/API/MCP 是行业领先的，但 SPA 问题导致99%爬虫看不到内容

## 总分
(50 + 35 + 55) / 3 = 46.7 ≈ 47

## 关键缺口
1. SPA 全站空白 — 最高影响，Google/LLM 爬虫看不到产品、FAQ、文章
2. 无 Product schema — 产品页无结构化数据，AI 无法理解产品属性
3. 无 sameAs/社媒链接 — 无社交图谱连通性
4. 无 robots.txt 标准指令 — AI 爬虫无访问指引
5. 无 FAQPage/Article/BreadcrumbList schema
6. 核心内容（FAQ、文章、产品详情）仅 SPA 渲染

## 行业对标
行业: 高端淋浴门在线零售（美国市场）
主要竞品: DreamLine, Vigo, Basco, Kohler
