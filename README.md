# 基于OpenClaw 的独立站GEO实现品牌 AI 可见度检测报告

开发循环：

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


局域网（需先停止已有 Gateway：`openclaw gateway stop`）
pnpm openclaw config set gateway.bind lan
pnpm openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true
pnpm openclaw gateway run
# 另一终端启动 UI 热重载（默认 http://<本机IP>:5173）
pnpm ui:dev

```
