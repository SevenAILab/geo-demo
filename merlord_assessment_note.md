# Merlord GEO 体检笔记

## 站点概况
- URL: https://merlord.com
- 行业: 家居建材 - 无框淋浴门
- 定位: 工厂直供、美国境内、定制无框淋浴门
- 技术栈: React SPA (Vite/Rolldown) + Node.js API

## Schema.org (评分: 75-80)
✅ Organization JSON-LD (全站所有页面均有，含 name/url/logo/description/email/phone/address/contactPoint)
✅ WebSite JSON-LD with SearchAction (全站所有页面)
✅ Product JSON-LD (产品详情页，含 name/sku/brand/offers/shippingDetails/description/images)
✅ BreadcrumbList (产品详情页)
✅ FAQPage (产品详情页，8个FAQ条目)
⚠️ 缺少 sameAs（无社交链接）
⚠️ 缺少 AggregateRating/Review（无评分或评论）
⚠️ 缺少 LocalBusiness 类型（虽然 Organization 包含了地址）

## 实体连通性 (评分: 45-50)
✅ 品牌名 "Merlord" 在所有页面一致
✅ 地理位置 (Walnut, CA)、邮箱、电话信息一致
⚠️ 无 sameAs 社交链接（无法构建社交图谱）
⚠️ 没有评价平台链接 (无 Trustpilot, Google Reviews, 无 BBB)
⚠️ 无外部权威引用的证据
⚠️ 无社交媒体账户链接

## AI 响应 (评分: 75-80)
✅ 优秀的 llms.txt（包含产品目录、购买指南、FAQ、API端点、MCP配置）
✅ 8篇购买指南文章，内容扎实
✅ Agent API 完全文档化
✅ FAQPage JSON-LD 嵌入产品页
✅ MCP 可供 Claude Code/OpenClaw 安装
⚠️ React SPA + CSR: 核心内容 JS 渲染
⚠️ robots.txt 和 sitemap.xml 返回 SPA 壳（非真正的内容文件）
⚠️ 无静态/服务端渲染的内容页面
