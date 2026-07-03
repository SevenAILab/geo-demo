# 三维度评分

## Schema.org (id: schema)

- 首页/产品页是否有 Organization/Product/FAQ JSON-LD
- 字段是否完整（name, url, description, sameAs）
- 分数低：无结构化数据或仅 microdata 残缺

## 实体连通性 (id: entity)

- 品牌名、产品名、创始人/公司是否在页面一致出现
- sameAs / 社交链接是否形成实体图谱
- 分数低：品牌表述混乱、无权威外链

## AI 响应 (id: aiResponse)

- 内容是否可被 LLM 直接引用（清晰 Q&A、事实块、无纯 SPA 空壳）
- llms.txt / robots 是否 AI 友好
- 分数低：关键信息在 JS 渲染后、无 FAQ/事实页
