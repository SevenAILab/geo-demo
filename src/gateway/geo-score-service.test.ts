import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  geoScoreServiceEnabled,
  geoScoreServicePort,
  planGeoScoreServiceSpawn,
  resolveGeoScoreServerPath,
} from "./geo-score-service.js";

const cfg = (controlUi: Record<string, unknown>): OpenClawConfig =>
  ({ gateway: { controlUi } }) as unknown as OpenClawConfig;

describe("geoScoreServiceEnabled", () => {
  it("is false by default / when flag absent", () => {
    expect(geoScoreServiceEnabled(undefined)).toBe(false);
    expect(geoScoreServiceEnabled(cfg({}))).toBe(false);
    expect(geoScoreServiceEnabled(cfg({ geoScoreService: false }))).toBe(false);
  });

  it("is true only when explicitly enabled", () => {
    expect(geoScoreServiceEnabled(cfg({ geoScoreService: true }))).toBe(true);
  });
});

describe("geoScoreServicePort", () => {
  it("defaults to 8799", () => {
    expect(geoScoreServicePort(undefined)).toBe(8799);
    expect(geoScoreServicePort(cfg({ geoScoreService: true }))).toBe(8799);
  });

  it("honors a valid configured port", () => {
    expect(geoScoreServicePort(cfg({ geoScoreServicePort: 9010 }))).toBe(9010);
  });

  it("falls back to default for invalid ports", () => {
    expect(geoScoreServicePort(cfg({ geoScoreServicePort: 0 }))).toBe(8799);
    expect(geoScoreServicePort(cfg({ geoScoreServicePort: 70000 }))).toBe(8799);
    expect(geoScoreServicePort(cfg({ geoScoreServicePort: 1.5 }))).toBe(8799);
  });
});

describe("resolveGeoScoreServerPath", () => {
  it("points at geo-scoring-kit/scripts/geo-dev-server.mjs", () => {
    const p = resolveGeoScoreServerPath();
    expect(p.replace(/\\/g, "/")).toMatch(/geo-scoring-kit\/scripts\/geo-dev-server\.mjs$/);
  });
});

describe("planGeoScoreServiceSpawn", () => {
  it("returns null when disabled", () => {
    expect(planGeoScoreServiceSpawn(cfg({}))).toBeNull();
  });

  it("plans a node spawn with PORT env when enabled", () => {
    const plan = planGeoScoreServiceSpawn(
      cfg({ geoScoreService: true, geoScoreServicePort: 8801 }),
    );
    expect(plan).not.toBeNull();
    expect(plan?.command).toBe(process.execPath);
    expect(plan?.args[0].replace(/\\/g, "/")).toMatch(/geo-dev-server\.mjs$/);
    expect(plan?.port).toBe(8801);
    expect(plan?.env).toEqual({ PORT: "8801" });
  });
});
