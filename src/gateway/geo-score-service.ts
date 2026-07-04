import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OpenClawConfig } from "../config/config.js";

// geo-score-service.ts — 方案 B：网关启动时可选地把 GEO 评分后端
// (geo-scoring-kit/scripts/geo-dev-server.mjs) 作为子进程自动拉起，免去手动起第二个进程。
// 纯 dev 便利：默认关闭，仅当 gateway.controlUi.geoScoreService === true 才启动。
// 一切 spawn 失败都吞掉、绝不抛，避免影响网关自身启动。

const DEFAULT_PORT = 8799;

export type GeoScoreServiceLog = {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
};

/** 是否启用（opt-in）。 */
export function geoScoreServiceEnabled(cfg: OpenClawConfig | undefined): boolean {
  return cfg?.gateway?.controlUi?.geoScoreService === true;
}

/** 端口：配置优先，否则默认 8799。 */
export function geoScoreServicePort(cfg: OpenClawConfig | undefined): number {
  const raw = cfg?.gateway?.controlUi?.geoScoreServicePort;
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw < 65536
    ? raw
    : DEFAULT_PORT;
}

/** 评分后端脚本的绝对路径（相对本文件定位到仓库根的 geo-scoring-kit）。 */
export function resolveGeoScoreServerPath(moduleUrl: string = import.meta.url): string {
  // src/gateway/geo-score-service.ts → 仓库根 → geo-scoring-kit/scripts/geo-dev-server.mjs
  const here = path.dirname(fileURLToPath(moduleUrl));
  const repoRoot = path.resolve(here, "..", "..");
  return path.join(repoRoot, "geo-scoring-kit", "scripts", "geo-dev-server.mjs");
}

/**
 * 计算 spawn 参数（纯函数，便于测试）。返回 null 表示未启用、不应 spawn。
 */
export function planGeoScoreServiceSpawn(
  cfg: OpenClawConfig | undefined,
  moduleUrl?: string,
): { command: string; args: string[]; port: number; env: Record<string, string> } | null {
  if (!geoScoreServiceEnabled(cfg)) {
    return null;
  }
  const port = geoScoreServicePort(cfg);
  return {
    command: process.execPath, // 当前 node
    args: [resolveGeoScoreServerPath(moduleUrl)],
    port,
    env: { PORT: String(port) },
  };
}

let activeChild: ChildProcess | null = null;

/**
 * 若启用则拉起评分后端子进程，并挂上随网关退出而清理的钩子。
 * 幂等：已在运行则不重复启动。绝不抛异常。
 */
export function maybeStartGeoScoreService(
  cfg: OpenClawConfig | undefined,
  log?: GeoScoreServiceLog,
): ChildProcess | null {
  try {
    if (activeChild && activeChild.exitCode === null && !activeChild.killed) {
      return activeChild; // 已在运行
    }
    const plan = planGeoScoreServiceSpawn(cfg);
    if (!plan) {
      return null;
    }
    const child = spawn(plan.command, plan.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...plan.env },
      windowsHide: true,
    });
    activeChild = child;

    child.stdout?.on("data", (buf: Buffer) => log?.info?.(`[geo-score] ${buf.toString().trim()}`));
    child.stderr?.on("data", (buf: Buffer) => log?.info?.(`[geo-score] ${buf.toString().trim()}`));
    child.on("error", (err) => log?.warn?.(`geo-score service spawn failed: ${String(err)}`));
    child.on("exit", (code) => {
      if (activeChild === child) {
        activeChild = null;
      }
      log?.info?.(`geo-score service exited (code=${code ?? "null"})`);
    });

    const kill = () => stopGeoScoreService();
    process.once("exit", kill);
    process.once("SIGINT", kill);
    process.once("SIGTERM", kill);

    log?.info?.(`geo-score service starting on 127.0.0.1:${plan.port} (pid=${child.pid ?? "?"})`);
    return child;
  } catch (err) {
    log?.warn?.(`geo-score service not started: ${String(err)}`);
    return null;
  }
}

/** 停止子进程（网关退出时调用）。绝不抛。 */
export function stopGeoScoreService(): void {
  try {
    if (activeChild && activeChild.exitCode === null && !activeChild.killed) {
      activeChild.kill();
    }
  } catch {
    // ignore
  } finally {
    activeChild = null;
  }
}
