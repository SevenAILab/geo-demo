# 基于 OpenClaw 的独立站 GEO 品牌 AI 可见度检测报告

这个项目是在 OpenClaw Control UI 上开发的 GEO demo，用来体验独立站品牌 AI 可见度检测和修复流程。

## 页面流程

1. 进入 GEO 首页，输入网址，点击「开始体验」。
2. 跳转到品牌 AI 可见度评估页。
3. 点击「修复这些缺口」，进入品牌 AI 可见度修复方案。

## 项目内配置文件

本 demo 使用项目内配置文件：

```text
config/openclaw.geo-demo.json
```

该文件包含：

```json
{
  "gateway": {
    "mode": "local",
    "controlUi": {
      "geoDevSkipSkillWait": true,
      "geoPersistHistory": true
    }
  }
}
```

`geoDevSkipSkillWait` 是内部开发测试开关。设置为 `true` 时，第二步 GEO 对话不会等待真实助理回复，会直接使用内置 demo 数据，方便本地快速调试页面流程。

如果要恢复真实对话等待，把它改成 `false`：

```json
{
  "gateway": {
    "mode": "local",
    "controlUi": {
      "geoDevSkipSkillWait": false
    }
  }
}
```

`geoPersistHistory` 控制“聊天历史记录”功能。设置为 `true` 时，GEO demo 会把上一次分析的站点、所处阶段以及各阶段的会话 key 记在浏览器 localStorage 里（真实聊天内容仍存在服务端会话中）。下次进入 GEO demo 时，若检测到上次的数据，落地页会出现“继续上次分析”入口，点击后直接从服务端会话历史还原各面板，无需重新跑一遍 skill。默认 `false`（关闭）；主动点“返回”回到落地页会清除该记录。

## 本地开发

在仓库根目录执行。Windows PowerShell 推荐先把 OpenClaw 配置路径指向项目内配置文件：

```powershell
$env:OPENCLAW_CONFIG_PATH = "$PWD\config\openclaw.geo-demo.json"
```

然后分终端启动开发流程。

终端 1：构建并启动 UI 热重载：

```powershell
pnpm.cmd ui:build
pnpm.cmd ui:dev
```

终端 2：启动 Gateway：

```powershell
$env:OPENCLAW_CONFIG_PATH = "$PWD\config\openclaw.geo-demo.json"
pnpm.cmd openclaw gateway run
```

终端 3：打开控制台：

```powershell
$env:OPENCLAW_CONFIG_PATH = "$PWD\config\openclaw.geo-demo.json"
pnpm.cmd openclaw dashboard --no-open
```

需要重新初始化本地 OpenClaw 时，也使用同一个配置路径：

```powershell
$env:OPENCLAW_CONFIG_PATH = "$PWD\config\openclaw.geo-demo.json"
pnpm.cmd openclaw onboard --mode local
```

## 路径确认

确认当前 OpenClaw 实际读取的是哪个配置文件：

```powershell
pnpm.cmd openclaw config file
```

输出路径末尾应该是：

```text
config/openclaw.geo-demo.json
```
