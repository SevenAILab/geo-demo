import { GEO_VALUE_PROP_OTHER_ID, type GeoBrandStory } from "../geo-parsers.ts";

export type BrandProfileFieldId =
  | "brandName"
  | "industry"
  | "audience"
  | "competitors"
  | "valueProps"
  | "differentiator";

export type BrandProfileGap = {
  id: BrandProfileFieldId | "valuePropOther";
  titleKey: string;
  descKey: string;
};

export type BrandProfileIdentified = {
  id: BrandProfileFieldId;
  labelKey: string;
  value: string;
};

export type BrandProfileStats = {
  percent: number;
  identified: BrandProfileIdentified[];
  gaps: BrandProfileGap[];
};

const FIELD_IDS: BrandProfileFieldId[] = [
  "brandName",
  "industry",
  "audience",
  "competitors",
  "valueProps",
  "differentiator",
];

function valuePropsFilled(story: GeoBrandStory | null): boolean {
  if (!story || story.valueProps.length === 0) {
    return false;
  }
  if (story.valueProps.includes(GEO_VALUE_PROP_OTHER_ID)) {
    return Boolean(story.valuePropOther?.trim());
  }
  return true;
}

function valuePropsSummary(story: GeoBrandStory): string {
  const labels = story.valuePropOptions
    .filter((option) => story.valueProps.includes(option.id))
    .map((option) => option.label);
  if (story.valueProps.includes(GEO_VALUE_PROP_OTHER_ID) && story.valuePropOther?.trim()) {
    labels.push(story.valuePropOther.trim());
  }
  return labels.join("、");
}

function fieldValue(story: GeoBrandStory, id: BrandProfileFieldId): string {
  switch (id) {
    case "brandName":
      return story.brandName.trim();
    case "industry":
      return story.industry.trim();
    case "audience":
      return story.audience.trim();
    case "competitors":
      return story.competitors.filter(Boolean).join("、");
    case "valueProps":
      return valuePropsSummary(story);
    case "differentiator":
      return story.differentiator.trim();
  }
}

function isFieldIdentified(story: GeoBrandStory, id: BrandProfileFieldId): boolean {
  if (id === "valueProps") {
    return valuePropsFilled(story);
  }
  if (id === "competitors") {
    return story.competitors.some((url) => url.trim());
  }
  return Boolean(fieldValue(story, id));
}

const LABEL_KEYS: Record<BrandProfileFieldId, string> = {
  brandName: "geo.brandStory.brandName",
  industry: "geo.brandStory.industry",
  audience: "geo.brandStory.audience",
  competitors: "geo.brandStory.competitorTitle",
  valueProps: "geo.brandStory.valueProp",
  differentiator: "geo.brandStory.differentiator",
};

const GAP_DESC_KEYS: Record<BrandProfileFieldId | "valuePropOther", string> = {
  brandName: "geo.brandStory.gapDesc.brandName",
  industry: "geo.brandStory.gapDesc.industry",
  audience: "geo.brandStory.gapDesc.audience",
  competitors: "geo.brandStory.gapDesc.competitors",
  valueProps: "geo.brandStory.gapDesc.valueProps",
  valuePropOther: "geo.brandStory.gapDesc.valuePropOther",
  differentiator: "geo.brandStory.gapDesc.differentiator",
};

export function computeBrandProfileStats(story: GeoBrandStory | null): BrandProfileStats {
  if (!story) {
    return { percent: 0, identified: [], gaps: FIELD_IDS.map((id) => gapEntry(id)) };
  }

  const identified: BrandProfileIdentified[] = [];
  const gaps: BrandProfileGap[] = [];

  for (const id of FIELD_IDS) {
    if (isFieldIdentified(story, id)) {
      identified.push({
        id,
        labelKey: LABEL_KEYS[id],
        value: fieldValue(story, id),
      });
    } else if (id === "valueProps") {
      gaps.push(gapEntry("valueProps"));
    } else if (id !== "competitors") {
      gaps.push(gapEntry(id));
    }
  }

  if (
    story.valueProps.includes(GEO_VALUE_PROP_OTHER_ID) &&
    !story.valuePropOther?.trim() &&
    !gaps.some((gap) => gap.id === "valuePropOther")
  ) {
    gaps.push({
      id: "valuePropOther",
      titleKey: "geo.brandStory.valuePropOther",
      descKey: GAP_DESC_KEYS.valuePropOther,
    });
  }

  const percent = Math.round((identified.length / FIELD_IDS.length) * 100);
  return { percent, identified, gaps };
}

function gapEntry(id: BrandProfileFieldId): BrandProfileGap {
  return {
    id,
    titleKey: LABEL_KEYS[id],
    descKey: GAP_DESC_KEYS[id],
  };
}
