import type { GeoBrandStory, GeoMonitoring, GeoRepairPack } from "./geo-parsers.ts";
import type { GeoReport } from "./geo-report.ts";

export function deriveBrandNameFromUrl(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? "BrandGEO";
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "BrandGEO";
  }
}

export function createDemoGeoReport(siteUrl: string): GeoReport {
  const brandName = deriveBrandNameFromUrl(siteUrl);
  const ownedInitial = brandName.charAt(0) || "品";
  const currentVisibility = 42;
  return {
    totalScore: 42,
    rating: "weak",
    summary: `${brandName} 可被检索到，但 AI 回答仍缺乏结构化实体证据，需补齐 Schema 与可引用内容。`,
    metrics: [
      {
        id: "schema",
        label: "Schema.org",
        value: 38,
        statusLabel: "缺少 Organization 与 FAQ 实体标记",
      },
      {
        id: "entity",
        label: "实体连通性",
        value: 45,
        statusLabel: "品牌事实分散在多个页面",
      },
      {
        id: "aiResponse",
        label: "AI 响应",
        value: 41,
        statusLabel: "答案引擎引用置信度偏低",
      },
    ],
    gaps: [
      {
        id: "entity-home",
        title: "缺少 canonical 品牌事实页",
        impact: "high",
        description: "答案引擎缺少一页集中定义品牌、产品与受众的可引用内容。",
      },
      {
        id: "schema-faq",
        title: "结构化数据不完整",
        impact: "high",
        description: "应补充 Organization、Product 与 FAQ Schema 以强化机器可读上下文。",
      },
      {
        id: "comparison-content",
        title: "缺少对比型内容",
        impact: "medium",
        description: "买家会向 AI 询问替代方案，但站点缺少可对比的公开证据。",
      },
    ],
    industryAnalysis: {
      currentVisibility,
      yourRanking: "#暂无 - 您的排名",
      trend: [
        { date: "9/21", value: 35.2 },
        { date: "9/22", value: 37.6 },
        { date: "9/23", value: 39.1 },
        { date: "9/24", value: 38.8 },
        { date: "9/25", value: 40.3 },
        { date: "9/26", value: currentVisibility },
      ],
      rankings: [
        {
          id: "owned",
          initial: ownedInitial,
          name: brandName,
          score: currentVisibility,
          owned: true,
        },
        { id: "c1", initial: "A", name: "行业标杆 A", score: 68.4 },
        { id: "c2", initial: "B", name: "行业标杆 B", score: 54.2 },
        { id: "c3", initial: "C", name: "行业标杆 C", score: 47.8 },
        { id: "c4", initial: "D", name: "行业标杆 D", score: 39.5 },
      ],
    },
  };
}

export function createDemoGeoBrandStory(siteUrl: string): GeoBrandStory {
  const brandName = deriveBrandNameFromUrl(siteUrl);
  return {
    brandName,
    industry: "Digital health content and services",
    valuePropOptions: [
      {
        id: "trusted-health-answers",
        label:
          "A trusted health information brand that turns expert guidance into AI-citable answers.",
        suggested: true,
      },
      {
        id: "care-pathways",
        label: "Practical care pathways that help readers move from symptoms to next actions.",
      },
    ],
    valueProps: ["trusted-health-answers"],
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
    title: "买家在问 'BrandGEO vs 其他方案'",
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

export const DEMO_ARTICLE_PREVIEW = `Why BrandGEO is the standard for AI-First Branding

Large Language Models (LLMs) are reshaping how buyers discover brands. Generative Engine Optimization (GEO) ensures your entity is structured, citeable, and recommended.

BrandGEO helps teams publish schema, llms.txt directives, and entity-rich content that LLMs can trust and reference in answers.`;
