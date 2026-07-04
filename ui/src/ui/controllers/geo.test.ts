import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoHost } from "./geo.ts";
import { backToGeoLanding, startGeoExperience } from "./geo.ts";

const runGeoSkillMock = vi.hoisted(() =>
  vi.fn(async (host: GeoHost, action: string) => {
    expect(action).toBe("assessment");
    host.geoReport = {
      totalScore: 42,
      rating: "weak",
      summary: "Merlord demo report",
      metrics: [],
      gaps: [],
    };
    host.geoReportStatus = "ready";
    host.geoPendingSkill = null;
    return true;
  }),
);

const geoHistoryMocks = vi.hoisted(() => ({
  clearGeoActiveRun: vi.fn(),
  createGeoRun: vi.fn(),
  markGeoFlowActive: vi.fn(),
  updateGeoRunFromHost: vi.fn(),
}));

vi.mock("../geo-skill-runner.ts", () => ({
  runGeoSkill: runGeoSkillMock,
}));

vi.mock("../geo-report.ts", () => ({
  resetGeoReport: (host: GeoHost) => {
    host.geoReport = null;
    host.geoReportStatus = "idle";
  },
  syncGeoReportFromChat: vi.fn(),
}));

vi.mock("../geo-parsers.ts", () => ({
  isGeoStepReady: vi.fn(() => false),
  resetGeoPhaseData: vi.fn(),
}));

vi.mock("../geo-history.ts", () => ({
  applyGeoRunSnapshot: vi.fn(),
  clearGeoActiveRun: geoHistoryMocks.clearGeoActiveRun,
  createGeoRun: geoHistoryMocks.createGeoRun,
  getGeoRunSnapshot: vi.fn(),
  markGeoFlowActive: geoHistoryMocks.markGeoFlowActive,
  persistGeoRunSnapshot: vi.fn(),
  refreshGeoHistory: vi.fn(),
  updateGeoRunFromHost: geoHistoryMocks.updateGeoRunFromHost,
}));

vi.mock("../geo-session.ts", () => ({
  phaseToSkillAction: vi.fn(() => null),
  restoreGeoSession: vi.fn(),
}));

vi.mock("./chat.ts", () => ({
  loadChatHistory: vi.fn(async () => undefined),
}));

function createHost(): GeoHost {
  const host = {
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
    geoActiveRunId: null,
    geoBrandStory: null,
    geoBrandStoryStatus: "idle",
    geoChatSidebarOpen: false,
    geoHistoryRuns: [],
    geoMonitoring: null,
    geoMonitoringStatus: "idle",
    geoOutputCenter: null,
    geoOutputStatus: "idle",
    geoPendingSkill: null,
    geoPhase: "landing",
    geoPreviewBlocked: false,
    geoRepairPack: null,
    geoRepairPackStatus: "idle",
    geoReport: null,
    geoReportStatus: "idle",
    geoResumeDismissed: false,
    geoSessionKeys: {},
    geoSiteUrl: "merlord.com",
    geoSkillBusy: false,
    geoStarting: false,
    hello: null,
    password: null,
    refreshSessionsAfterChat: new Map(),
    requestUpdate: vi.fn(),
    sessionKey: "main",
    settings: { gatewayUrl: "wss://gw.example/openclaw" },
  } as unknown as GeoHost;
  host.controlUiBootstrapReady = Promise.resolve();
  return host;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startGeoExperience", () => {
  it("runs the assessment skill after bootstrap and marks the report ready", async () => {
    const host = createHost();

    await expect(startGeoExperience(host)).resolves.toBe(true);

    expect(host.geoSiteUrl).toBe("https://merlord.com");
    expect(host.geoPhase).toBe("assessment");
    expect(host.geoReportStatus).toBe("ready");
    expect(host.geoReport?.summary).toContain("Merlord");
    expect(host.geoPendingSkill).toBeNull();
    expect(host.geoStarting).toBe(false);
    expect(runGeoSkillMock).toHaveBeenCalledTimes(1);
  });
});

describe("backToGeoLanding", () => {
  it("clears the active run and returns to the landing page", () => {
    const host = createHost();
    host.geoPhase = "brandStory";
    host.geoStarting = true;

    backToGeoLanding(host);

    expect(host.geoPhase).toBe("landing");
    expect(host.geoStarting).toBe(false);
    expect(geoHistoryMocks.clearGeoActiveRun).toHaveBeenCalledWith(host);
    expect(geoHistoryMocks.markGeoFlowActive).toHaveBeenCalledWith("landing");
  });
});
