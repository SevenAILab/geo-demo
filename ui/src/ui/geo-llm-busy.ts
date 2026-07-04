import { t } from "../i18n/index.ts";
import type { GeoPhase } from "./controllers/geo.ts";
import type { GeoDataStatus, GeoSkillAction } from "./geo-parsers.ts";
import type { GeoReportStatus } from "./geo-report.ts";

export type GeoLlmBusyInput = {
  skillBusy: boolean;
  starting?: boolean;
  status?: GeoDataStatus;
  reportStatus?: GeoReportStatus;
};

export function isGeoLlmBusy(input: GeoLlmBusyInput): boolean {
  if (input.skillBusy || input.starting) {
    return true;
  }
  if (input.status === "loading" || input.reportStatus === "loading") {
    return true;
  }
  return false;
}

const SKILL_PROGRESS_KEYS: Record<GeoSkillAction, string> = {
  assessment: "geo.history.progress.assessment",
  brandStory: "geo.history.progress.brandStory",
  content: "geo.history.progress.outputCenter",
  fixpack: "geo.history.progress.repairPack",
  monitoring: "geo.history.progress.monitoringPanel",
};

const PHASE_PROGRESS_KEYS: Partial<Record<GeoPhase, string>> = {
  assessment: "geo.history.progress.assessment",
  brandStory: "geo.history.progress.brandStory",
  outputCenter: "geo.history.progress.outputCenter",
  repairPack: "geo.history.progress.repairPack",
  monitoringPanel: "geo.history.progress.monitoringPanel",
};

export function resolveGeoLlmProgressTitle(
  phase: GeoPhase,
  pendingSkill: GeoSkillAction | null,
): string {
  if (pendingSkill) {
    return t(SKILL_PROGRESS_KEYS[pendingSkill]);
  }
  const phaseKey = PHASE_PROGRESS_KEYS[phase];
  return phaseKey ? t(phaseKey) : t("geo.history.progress.started");
}

export function buildGeoLlmProgress(
  input: GeoLlmBusyInput & {
    phase: GeoPhase;
    pendingSkill: GeoSkillAction | null;
  },
): { active: boolean; title: string } {
  const active = isGeoLlmBusy(input);
  return {
    active,
    title: resolveGeoLlmProgressTitle(input.phase, input.pendingSkill),
  };
}
