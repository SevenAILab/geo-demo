# 行业可见度对标

## 目标

为 `industryAnalysis` 生成同行业可见度趋势与竞品排名，供 UI 展示行业 GEO 对比。

## 数据采集

- 从站点内容推断行业/品类（首页标题、meta、产品描述）
- 优先用 `web_search` 查找同行业公开品牌或竞品名称
- 不要编造无法在工具结果或页面中验证的第三方引用数据

## trend（历史趋势）

- 至少 3 个时间点，`date` 为简短日期标签（如 `9/21`）
- `value` 0–100，表示估算可见度百分比
- 基于当前 `totalScore` 与体检结论生成合理序列
- 末点 `value` 应与 `currentVisibility` 一致或接近

## rankings（竞品排名）

- 至少 3 条，按 `score` 降序
- **恰好 1 条** `owned: true`，对应当前站点品牌
- `initial` 为名称首字或首字母（1 字符）
- `name` 为品牌/资产名称（简体中文）
- 竞品名称应来自行业常识或搜索可验证的公开品牌

## yourRanking

- `owned` 在 `rankings` 内时，必须为 `#N - 您的排名`（N = 按 `score` 降序后的 1-based 位次）
- 仅当 owned 无法纳入 `rankings` 时使用：`暂无 - 您的排名`
- Control UI 也会从 `rankings` 推导并覆盖该字段，但输出仍应写正确位次

## currentVisibility

- 0–100，通常取 trend 末点或 owned 条目的 score

## 语言

- `yourRanking`、`rankings[].name` 等面向用户字段使用简体中文
- `id`、`owned` 等技术字段保持英文
