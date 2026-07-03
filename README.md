# 基于OpenClaw 的独立站GEO实现品牌 AI 可见度检测报告
1、首页页面（geo）->输入网址->点击【开始体验】
2、跳转品牌AI可见度评估页面
3、点击【修复这些缺口】，跳转品牌AI可见度修复方案

开发循环：

```bash
# UI 热重载开发：
---------------------------------------------
pnpm ui:build
pnpm ui:dev
pnpm openclaw gateway run
pnpm openclaw dashboard --no-open
openclaw onboard
```
