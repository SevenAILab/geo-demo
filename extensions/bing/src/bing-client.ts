import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import {
  DEFAULT_CACHE_TTL_MINUTES,
  DEFAULT_SEARCH_COUNT,
  normalizeCacheKey,
  readCache,
  readResponseText,
  resolveCacheTtlMs,
  resolveSearchCount,
  resolveSiteName,
  resolveTimeoutSeconds,
  withTrustedWebSearchEndpoint,
  wrapWebContent,
  writeCache,
} from "openclaw/plugin-sdk/provider-web-search";

const DEFAULT_BING_BASE_URL = "https://cn.bing.com/search";
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_MARKET = "zh-CN";
// cn.bing.com and www.bing.com redirect to each other; keep both under one allowlist.
const BING_SEARCH_SSRF_POLICY = {
  hostnameAllowlist: ["*.bing.com"],
} as const;

const BING_SEARCH_CACHE = new Map<
  string,
  { value: Record<string, unknown>; insertedAt: number; expiresAt: number }
>();

type BingResult = {
  title: string;
  url: string;
  snippet: string;
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripCdata(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("<![CDATA[") && trimmed.endsWith("]]>")) {
    return trimmed.slice("<![CDATA[".length, -"]]>".length);
  }
  return trimmed;
}

function readXmlTag(block: string, tag: string): string {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
  return decodeHtmlEntities(stripCdata(match?.[1] ?? "").trim());
}

function parseBingRss(xml: string): BingResult[] {
  const results: BingResult[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = match[1] ?? "";
    const title = readXmlTag(block, "title");
    const url = readXmlTag(block, "link");
    const snippet = readXmlTag(block, "description");
    if (title && url) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}

function resolveBingBaseUrl(config?: OpenClawConfig): string {
  const configured = config?.plugins?.entries?.bing?.config?.webSearch?.baseUrl;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim().replace(/\/+$/, "");
  }
  return DEFAULT_BING_BASE_URL;
}

function resolveBingMarket(config?: OpenClawConfig): string | undefined {
  const configured = config?.plugins?.entries?.bing?.config?.webSearch?.market;
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  return DEFAULT_MARKET;
}

export async function runBingSearch(params: {
  config?: OpenClawConfig;
  query: string;
  count?: number;
  timeoutSeconds?: number;
  cacheTtlMinutes?: number;
}): Promise<Record<string, unknown>> {
  const count = resolveSearchCount(params.count, DEFAULT_SEARCH_COUNT);
  const timeoutSeconds = resolveTimeoutSeconds(params.timeoutSeconds, DEFAULT_TIMEOUT_SECONDS);
  const cacheTtlMs = resolveCacheTtlMs(params.cacheTtlMinutes, DEFAULT_CACHE_TTL_MINUTES);
  const baseUrl = resolveBingBaseUrl(params.config);
  const market = resolveBingMarket(params.config);
  const cacheKey = normalizeCacheKey(
    JSON.stringify({
      provider: "bing",
      query: params.query,
      count,
      baseUrl,
      market: market ?? "",
    }),
  );
  const cached = readCache(BING_SEARCH_CACHE, cacheKey);
  if (cached) {
    return { ...cached.value, cached: true };
  }

  const url = new URL(baseUrl);
  url.searchParams.set("format", "rss");
  url.searchParams.set("q", params.query);
  url.searchParams.set("count", String(count));
  if (market) {
    url.searchParams.set("mkt", market);
  }

  const startedAt = Date.now();
  const results = await withTrustedWebSearchEndpoint(
    {
      url: url.toString(),
      timeoutSeconds,
      policy: BING_SEARCH_SSRF_POLICY,
      init: {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      },
    },
    async (response) => {
      if (!response.ok) {
        const detail = (await readResponseText(response, { maxBytes: 64_000 })).text;
        throw new Error(`Bing search error (${response.status}): ${detail || response.statusText}`);
      }
      const xml = await response.text();
      return parseBingRss(xml).slice(0, count);
    },
  );

  const payload = {
    query: params.query,
    provider: "bing",
    count: results.length,
    tookMs: Date.now() - startedAt,
    externalContent: {
      untrusted: true,
      source: "web_search",
      provider: "bing",
      wrapped: true,
    },
    results: results.map((result) => ({
      title: wrapWebContent(result.title, "web_search"),
      url: result.url,
      snippet: result.snippet ? wrapWebContent(result.snippet, "web_search") : "",
      siteName: resolveSiteName(result.url) || undefined,
    })),
  } satisfies Record<string, unknown>;

  writeCache(BING_SEARCH_CACHE, cacheKey, payload, cacheTtlMs);
  return payload;
}

export const testing = {
  decodeHtmlEntities,
  parseBingRss,
  readXmlTag,
  stripCdata,
};
export { testing as __testing };
