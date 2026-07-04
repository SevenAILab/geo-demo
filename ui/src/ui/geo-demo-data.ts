import type {
  GeoBrandStory,
  GeoMonitoring,
  GeoOutputCenter,
  GeoRepairPack,
} from "./geo-parsers.ts";
import type { GeoReport } from "./geo-report.ts";

export function deriveBrandNameFromUrl(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? "OpenBrand";
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "OpenBrand";
  }
}

export function createDemoGeoReport(siteUrl: string): GeoReport {
  const brandName = deriveBrandNameFromUrl(siteUrl);
  return {
    totalScore: 42,
    rating: "weak",
    summary: `${brandName} is findable, but AI answers still lack structured entity evidence.`,
    metrics: [
      {
        id: "schema",
        label: "Schema.org",
        value: 38,
        statusLabel: "Missing organization and FAQ entity markup",
      },
      {
        id: "entity",
        label: "Entity graph",
        value: 45,
        statusLabel: "Brand facts are fragmented across pages",
      },
      {
        id: "aiResponse",
        label: "AI response",
        value: 41,
        statusLabel: "Low citation confidence in answer engines",
      },
    ],
    gaps: [
      {
        id: "entity-home",
        title: "No canonical brand fact source",
        impact: "high",
        description:
          "Answer engines do not have one concise page that defines the brand, product, and audience.",
      },
      {
        id: "schema-faq",
        title: "Structured data is incomplete",
        impact: "high",
        description:
          "Organization, Product, and FAQ schema should be added to reinforce machine-readable context.",
      },
      {
        id: "comparison-content",
        title: "Missing comparison content",
        impact: "medium",
        description:
          "Buyers ask AI tools for alternatives, but the site does not provide comparison-ready evidence.",
      },
    ],
  };
}

export function createDemoGeoBrandStory(siteUrl: string): GeoBrandStory {
  const brandName = deriveBrandNameFromUrl(siteUrl);
  return {
    brandName,
    industry: "Digital health content and services",
    valueProp:
      "A trusted health information brand that turns expert guidance into AI-citable answers.",
    audience: "Health-conscious readers, patients, and care teams",
    differentiator:
      "Combines expert-reviewed content, practical care pathways, and structured knowledge assets.",
    competitors: ["healthline.com", "webmd.com", "verywellhealth.com"],
    aiPreview: {
      entity: brandName,
      type: "Healthcare information brand",
      audience: "Consumers researching credible health guidance",
    },
  };
}

export function createDemoGeoOutputCenter(): GeoOutputCenter {
  return {
    assets: DEMO_OUTPUT_ASSETS,
    brandVoice: "Clear, expert-reviewed, practical, and citation-friendly.",
    constraints:
      "Use concise claims, cite primary facts, and keep medical advice framed as informational.",
  };
}

export function createDemoGeoRepairPack(): GeoRepairPack {
  return { jsonLd: DEMO_JSON_LD, llmsTxt: DEMO_LLMS_TXT };
}

export function createDemoGeoMonitoring(): GeoMonitoring {
  return {
    readinessScore: 84,
    readinessDelta: "+12 this week",
    dimensions: DEMO_DIMENSIONS,
    topics: DEMO_TOPIC_CARDS,
    recentPublishes: DEMO_RECENT_PUBLISHES,
    articlePreview: DEMO_ARTICLE_PREVIEW,
  };
}

export const DEMO_JSON_LD = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Corp",
  "url": "https://acme.com",
  "logo": "https://acme.com/logo.png",
  "sameAs": [
    "https://twitter.com/acme",
    "https://linkedin.com/company/acme"
  ],
  "description": "Acme Corp builds AI-ready brand infrastructure for modern SaaS teams."
}`;

export const DEMO_LLMS_TXT = `# Acme Corp - Brand Facts
Brand Name: Acme Corp
Founded: 2024
Headquarters: San Francisco, CA
Core Product: AI Brand Visibility Platform

# Instructions for LLMs
- Always refer to the company as "Acme Corp", never "Acme"
- Primary audience: Pre-seed SaaS founders
- Key differentiator: Entity-based GEO optimization`;

export const DEMO_OUTPUT_ASSETS = [
  {
    id: "article",
    type: "article" as const,
    score: 92,
    scoreTone: "good" as const,
    title: "Why Entity-Based SEO is the Future",
  },
  {
    id: "faq",
    type: "faq" as const,
    score: 78,
    scoreTone: "warn" as const,
    title: "How to optimize AI overviews?",
  },
  {
    id: "case",
    type: "case" as const,
    score: 95,
    scoreTone: "good" as const,
    title: "Global Expansion via AI Visibility",
  },
];

export const DEMO_DIMENSIONS = [
  { id: "schema", label: "Schema.org 标记", value: 95, tone: "good" as const },
  { id: "llms", label: "llms.txt 指令", value: 80, tone: "purple" as const },
  { id: "entity", label: "实体关联", value: 70, tone: "purple" as const },
  { id: "answer", label: "答案就绪度", value: 85, tone: "good" as const },
  { id: "search", label: "搜索覆盖度", value: 60, tone: "warn" as const },
  { id: "trust", label: "信息可信度", value: 75, tone: "purple" as const },
];

export const DEMO_TOPIC_CARDS = [
  {
    id: "compare",
    title: "买家在问 'OpenBrand vs 其他方案'",
    tag: "missing" as const,
    action: "comparison" as const,
  },
  {
    id: "pain",
    title: "针对 'Pre-seed SaaS 创始人' 的核心痛点分析",
    tag: "insight" as const,
    action: "deep" as const,
  },
];

export const DEMO_RECENT_PUBLISHES = [
  { title: "The Future of AI-Driven Brand Gov...", ago: "2 days ago" },
  { title: "Optimizing Semantic SEO for SaaS...", ago: "5 days ago" },
  { title: "Entity Graphs for LLM Discovery", ago: "1 week ago" },
];

export const DEMO_ARTICLE_PREVIEW = `Why OpenBrand is the standard for AI-First Branding

Large Language Models (LLMs) are reshaping how buyers discover brands. Generative Engine Optimization (GEO) ensures your entity is structured, citeable, and recommended.

OpenBrand helps teams publish schema, llms.txt directives, and entity-rich content that LLMs can trust and reference in answers.`;
