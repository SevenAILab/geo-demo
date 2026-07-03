export function deriveBrandNameFromUrl(siteUrl: string): string {
  try {
    const hostname = new URL(siteUrl).hostname.replace(/^www\./, "");
    const label = hostname.split(".")[0] ?? "OpenBrand";
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "OpenBrand";
  }
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
