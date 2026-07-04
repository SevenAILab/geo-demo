import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeoHistory, loadGeoHistory } from "../geo-history-storage.ts";
import { syncGeoStateFromChat } from "../geo-parsers.ts";
import { phaseToSkillAction, restoreGeoSession } from "../geo-session.ts";
import { loadChatHistory } from "./chat.ts";
import type { GeoHost } from "./geo.ts";
import {
  backToGeoLanding,
  detectGeoResume,
  resumeGeoExperience,
  startGeoExperience,
} from "./geo.ts";

const runGeoSkillMock = vi.hoisted(() =>
  vi.fn(async (host: GeoHost, action: string) => {
    expect(action).toBe("assessment");
    expect(host.geoDevSkipSkillWait).toBe(true);
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
  resetGeoPhaseData: vi.fn(),
  syncGeoStateFromChat: vi.fn(),
}));

vi.mock("../geo-session.ts", () => ({
  phaseToSkillAction: vi.fn(() => null),
  restoreGeoSession: vi.fn(),
}));

vi.mock("./chat.ts", () => ({
  loadChatHistory: vi.fn(async () => undefined),
}));

vi.mock("../geo-history-storage.ts", () => ({
  clearGeoHistory: vi.fn(),
  loadGeoHistory: vi.fn(() => null),
  saveGeoHistory: vi.fn(),
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
    geoBrandStory: null,
    geoBrandStoryStatus: "idle",
    geoChatSidebarOpen: false,
    geoDevSkipSkillWait: false,
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
    geoSessionKeys: {},
    geoResumeSnapshot: null,
    geoPersistHistory: false,
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
  host.controlUiBootstrapReady = Promise.resolve().then(() => {
    host.geoDevSkipSkillWait = true;
  });
  return host;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadGeoHistory).mockReturnValue(null);
  vi.mocked(phaseToSkillAction).mockReturnValue(null);
});

describe("startGeoExperience", () => {
  it("honors the dev skip flag after bootstrap before the connection guard", async () => {
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

describe("detectGeoResume", () => {
  it("does nothing when the persist flag is disabled", () => {
    const host = createHost();
    host.geoPersistHistory = false;
    vi.mocked(loadGeoHistory).mockReturnValue({
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: { assessment: "sess-a" },
    });

    detectGeoResume(host);

    expect(host.geoResumeSnapshot).toBeNull();
    expect(loadGeoHistory).not.toHaveBeenCalled();
  });

  it("surfaces a stored snapshot on the landing page when the flag is enabled", () => {
    const host = createHost();
    host.geoPersistHistory = true;
    host.geoPhase = "landing";
    const snapshot = {
      siteUrl: "https://merlord.com",
      phase: "brandStory" as const,
      sessionKeys: { assessment: "sess-a", brandStory: "sess-b" },
    };
    vi.mocked(loadGeoHistory).mockReturnValue(snapshot);

    detectGeoResume(host);

    expect(host.geoResumeSnapshot).toBe(snapshot);
  });
});

describe("resumeGeoExperience", () => {
  it("restores site, session keys, and phase, then loads history and re-syncs", async () => {
    const host = createHost();
    host.geoResumeSnapshot = {
      siteUrl: "https://merlord.com",
      phase: "brandStory",
      sessionKeys: { assessment: "sess-a", brandStory: "sess-b" },
    };
    vi.mocked(phaseToSkillAction).mockReturnValueOnce("brandStory");

    await expect(resumeGeoExperience(host)).resolves.toBe(true);

    expect(host.geoSiteUrl).toBe("https://merlord.com");
    expect(host.geoPhase).toBe("brandStory");
    expect(host.geoSessionKeys).toEqual({ assessment: "sess-a", brandStory: "sess-b" });
    expect(host.geoResumeSnapshot).toBeNull();
    expect(restoreGeoSession).toHaveBeenCalledWith(host, "brandStory");
    expect(loadChatHistory).toHaveBeenCalledWith(host);
    expect(syncGeoStateFromChat).toHaveBeenCalledWith(host);
  });

  it("returns false when there is no snapshot to resume", async () => {
    const host = createHost();
    host.geoResumeSnapshot = null;

    await expect(resumeGeoExperience(host)).resolves.toBe(false);
    expect(loadChatHistory).not.toHaveBeenCalled();
  });
});

describe("backToGeoLanding", () => {
  it("clears persisted history and the resume offer", () => {
    const host = createHost();
    host.geoResumeSnapshot = {
      siteUrl: "https://merlord.com",
      phase: "assessment",
      sessionKeys: { assessment: "sess-a" },
    };

    backToGeoLanding(host);

    expect(host.geoPhase).toBe("landing");
    expect(host.geoResumeSnapshot).toBeNull();
    expect(clearGeoHistory).toHaveBeenCalledWith("wss://gw.example/openclaw");
  });
});
