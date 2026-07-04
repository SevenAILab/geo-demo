import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoSkillHost } from "./geo-skill-runner.ts";
import { runGeoSkill } from "./geo-skill-runner.ts";

vi.mock("./app-chat.ts", () => ({
  handleSendChat: vi.fn(async () => undefined),
}));

vi.mock("./geo-session.ts", () => ({
  beginGeoSkillSession: vi.fn(async () => "geo-session"),
}));

vi.mock("./geo-parsers.ts", () => ({
  syncGeoStateFromChat: vi.fn(),
}));

function createHost(): GeoSkillHost {
  return {
    basePath: "",
    chatAttachments: [],
    chatAvatarUrl: null,
    chatInputHistory: [],
    chatInputHistoryIndex: null,
    chatMessage: "",
    chatMessages: [],
    chatModelCatalog: [],
    chatModelOverrides: {},
    chatModelsLoading: false,
    chatQueue: [],
    chatRunId: null,
    chatSending: false,
    chatStream: null,
    client: null,
    connected: false,
    geoBrandStory: null,
    geoBrandStoryStatus: "idle",
    geoMonitoring: null,
    geoMonitoringStatus: "idle",
    geoOutputCenter: null,
    geoOutputStatus: "idle",
    geoPendingSkill: null,
    geoRepairPack: null,
    geoRepairPackStatus: "idle",
    geoReport: null,
    geoReportStatus: "idle",
    geoSessionKeys: {},
    geoSiteUrl: "https://merlord.com",
    geoSkillBusy: false,
    geoStarting: false,
    hello: null,
    password: null,
    refreshSessionsAfterChat: new Map(),
    requestUpdate: vi.fn(),
    sessionKey: "main",
    settings: {},
  } as unknown as GeoSkillHost;
}

describe("runGeoSkill", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/geo");
  });

  it("uses dev demo data instead of waiting for chat when the config flag is enabled", async () => {
    const host = createHost();
    host.geoDevSkipSkillWait = true;

    await expect(runGeoSkill(host, "brandStory")).resolves.toBe(true);

    expect(host.geoBrandStoryStatus).toBe("ready");
    expect(host.geoBrandStory?.brandName).toBe("Merlord");
    expect(host.geoPendingSkill).toBeNull();
    expect(host.geoSkillBusy).toBe(false);
    expect(host.requestUpdate).toHaveBeenCalled();
  });

  it("waits for bootstrap config before deciding whether to skip chat", async () => {
    const host = createHost();
    host.geoDevSkipSkillWait = false;
    host.controlUiBootstrapReady = Promise.resolve().then(() => {
      host.geoDevSkipSkillWait = true;
    });

    await expect(runGeoSkill(host, "brandStory")).resolves.toBe(true);

    expect(host.geoBrandStoryStatus).toBe("ready");
    expect(host.geoBrandStory?.brandName).toBe("Merlord");
    expect(host.geoPendingSkill).toBeNull();
  });

  it("keeps the normal disconnected guard when the config flag is disabled", async () => {
    const host = createHost();
    host.geoDevSkipSkillWait = false;

    await expect(runGeoSkill(host, "brandStory")).resolves.toBe(false);

    expect(host.geoBrandStory).toBeNull();
    expect(host.geoBrandStoryStatus).toBe("idle");
  });
});
