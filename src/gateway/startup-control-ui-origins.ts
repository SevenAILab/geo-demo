import {
  ensureControlUiAllowedOriginsForNonLoopbackBind,
  type GatewayNonLoopbackBindMode,
} from "../config/gateway-control-ui-origins.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  listExternalInterfaceAddresses,
  readNetworkInterfaces,
} from "../infra/network-interfaces.js";
import { isContainerEnvironment } from "./net.js";

const CONTROL_UI_DEV_PORT = 5173;

function buildLanDevOrigins(port: number): string[] {
  const origins = new Set<string>();
  for (const entry of listExternalInterfaceAddresses(readNetworkInterfaces(), "IPv4")) {
    origins.add(`http://${entry.address}:${port}`);
    origins.add(`http://${entry.address}:${CONTROL_UI_DEV_PORT}`);
  }
  return [...origins];
}

export async function maybeSeedControlUiAllowedOriginsAtStartup(params: {
  config: OpenClawConfig;
  log: { info: (msg: string) => void; warn: (msg: string) => void };
  runtimeBind?: unknown;
  runtimePort?: unknown;
}): Promise<{ config: OpenClawConfig; seededAllowedOrigins: boolean }> {
  const runtimeBind = params.runtimeBind ?? params.config.gateway?.bind;
  const runtimePort =
    typeof params.runtimePort === "number" && params.runtimePort > 0
      ? params.runtimePort
      : (params.config.gateway?.port ?? 18789);
  const extraOrigins =
    runtimeBind === "lan" || runtimeBind === "auto" ? buildLanDevOrigins(runtimePort) : undefined;
  const seeded = ensureControlUiAllowedOriginsForNonLoopbackBind(params.config, {
    isContainerEnvironment,
    runtimeBind: params.runtimeBind,
    runtimePort: params.runtimePort,
    extraOrigins,
  });
  if (!seeded.seededOrigins || !seeded.bind) {
    return { config: params.config, seededAllowedOrigins: false };
  }
  params.log.info(buildSeededOriginsInfoLog(seeded.seededOrigins, seeded.bind));
  return { config: seeded.config, seededAllowedOrigins: true };
}

function buildSeededOriginsInfoLog(origins: string[], bind: GatewayNonLoopbackBindMode): string {
  return (
    `gateway: seeded gateway.controlUi.allowedOrigins ${JSON.stringify(origins)} ` +
    `for bind=${bind} (required since v2026.2.26; see issue #29385). ` +
    "Applied for this runtime without writing config; add other origins to gateway.controlUi.allowedOrigins if needed."
  );
}
