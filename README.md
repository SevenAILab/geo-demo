# 概述
本项目是基于 OpenClaw 的独立站 GEO（Generative Engine Optimization） 演示：输入品牌网站 URL，经 AI Agent 多阶段分析，输出 AI 可见度体检 → 品牌故事 → 修复方案 → 技术修复包 → 监测面板 的完整闭环。

开发环境

```bash
# 安装
pnpm install

# 同步 Control UI 多语言（需 DeepSeek / OpenAI / Anthropic API Key）
$env:OPENCLAW_CONTROL_UI_I18N_PROVIDER = "deepseek"
$env:OPENCLAW_CONTROL_UI_I18N_MODEL = "deepseek-chat"
pnpm ui:i18n:sync

# UI 热重载开发：
---------------------------------------------
pnpm ui:dev:build
pnpm openclaw gateway run
openclaw onboard

pnpm openclaw dashboard --no-open
pnpm openclaw gateway stop


局域网（需先停止已有 Gateway：`pnpm openclaw gateway stop`）
pnpm openclaw config set gateway.bind lan
pnpm openclaw config set gateway.controlUi.allowInsecureAuth true
pnpm openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true
pnpm openclaw config set gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback true
pnpm openclaw config set gateway.controlUi.geoOnly true
pnpm openclaw gateway run
# 另一终端启动 UI 热重载（默认 http://<本机IP>:5173，例如 http://192.168.43.63:5173）
pnpm ui:dev
# 获取带 Token 的连接地址
pnpm openclaw dashboard --no-open

# geoOnly 开启后仅 /geo 可访问，/chat、/overview 等路径会自动跳回 /geo
```
