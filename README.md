# 基于OpenClaw 的独立站GEO实现品牌 AI 可见度检测报告

## 访问路径

| 界面 / 服务          | 默认地址                                | 说明                               |
| -------------------- | --------------------------------------- | ---------------------------------- |
| OpenClaw Dashboard   | `http://127.0.0.1:18789/`               | 系统管理、agent、token、模型、配置 |
| GEO 业务界面         | `http://127.0.0.1:18790/`               | GEO 体检、报告、修复包、监控       |
| GEO 到 OpenClaw 代理 | `http://127.0.0.1:18790/api/openclaw/*` | GEO 后端代调 OpenClaw Gateway      |

GEO 不再挂在 Dashboard 的 `/geo` 路由下；Dashboard 继续保留自己的 token 登录流程。

## 配置路径

| 文件                                         | 作用                                                |
| -------------------------------------------- | --------------------------------------------------- |
| `config/openclaw.geo-demo.json`              | GEO 项目配置：端口、host、OpenClaw 地址、功能开关   |
| `geo-scoring-kit/.env`                       | 本地 GEO 后端密钥配置，需自行从 `.env.example` 复制 |
| `geo-scoring-kit/.env.example`               | GEO 环境变量模板                                    |
| `geo-scoring-kit/scripts/geo-dev-server.mjs` | GEO 独立服务入口                                    |
| `docs/web/geo.md`                            | GEO 访问路径与 token 配置文档                       |

## GEO token 配置

复制环境变量模板：

```bash
cp geo-scoring-kit/.env.example geo-scoring-kit/.env
```

在 `geo-scoring-kit/.env` 中配置：

```env
GEO_PORT=18790
GEO_HOST=127.0.0.1
GEO_CONFIG_PATH=../config/openclaw.geo-demo.json
OPENCLAW_BASE_URL=http://127.0.0.1:18789
OPENCLAW_SERVICE_TOKEN=replace-with-openclaw-service-token
```

| 变量                     | 说明                                                 |
| ------------------------ | ---------------------------------------------------- |
| `OPENCLAW_BASE_URL`      | OpenClaw Gateway 地址，默认 `http://127.0.0.1:18789` |
| `OPENCLAW_SERVICE_TOKEN` | GEO 后端代调 OpenClaw 的 service token，只能放服务端 |
| `GEO_PORT`               | GEO 独立服务端口，默认 `18790`                       |
| `GEO_HOST`               | GEO 绑定地址，默认 `127.0.0.1`                       |

不要把 `OPENCLAW_SERVICE_TOKEN` 放到 `VITE_*`、前端配置、浏览器 localStorage 或提交到仓库。

## GEO 独立服务启动

```bash
# 启动 OpenClaw Gateway / Dashboard
pnpm gateway:dev

# 另一终端启动 GEO 独立服务
pnpm geo:dev
```

打开：

| 地址                      | 结果               |
| ------------------------- | ------------------ |
| `http://127.0.0.1:18789/` | OpenClaw Dashboard |
| `http://127.0.0.1:18790/` | GEO 业务界面       |

## 原开发循环

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
pnpm openclaw gateway stop


局域网（需先停止已有 Gateway：`pnpm openclaw gateway stop`）
pnpm openclaw config set gateway.bind lan
pnpm openclaw config set gateway.controlUi.allowInsecureAuth true
pnpm openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true
pnpm openclaw config set gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback true
pnpm openclaw gateway run
# 另一终端启动 UI 热重载（默认 http://<本机IP>:5173，例如 http://192.168.43.63:5173）
pnpm ui:dev
# 获取带 Token 的连接地址
pnpm openclaw dashboard --no-open

```
