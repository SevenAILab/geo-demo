import { readPositiveIntegerParam, readStringParam } from "openclaw/plugin-sdk/param-readers";
import type { WebSearchProviderPlugin } from "openclaw/plugin-sdk/provider-web-search-contract";
import { createBingWebSearchProviderBase } from "./bing-search-provider.shared.js";

type BingClientModule = typeof import("./bing-client.js");

let bingClientModulePromise: Promise<BingClientModule> | undefined;

function loadBingClientModule(): Promise<BingClientModule> {
  bingClientModulePromise ??= import("./bing-client.js");
  return bingClientModulePromise;
}

const BingSearchSchema = {
  type: "object",
  properties: {
    query: { type: "string", description: "Search query string." },
    count: {
      type: "integer",
      description: "Number of results to return (1-10).",
      minimum: 1,
      maximum: 10,
    },
  },
  additionalProperties: false,
} satisfies Record<string, unknown>;

export function createBingWebSearchProvider(): WebSearchProviderPlugin {
  return {
    ...createBingWebSearchProviderBase(),
    createTool: (ctx) => ({
      description:
        "Search the web using Bing. Returns titles, URLs, and snippets with no API key required.",
      parameters: BingSearchSchema,
      execute: async (args) => {
        const { runBingSearch } = await loadBingClientModule();
        return await runBingSearch({
          config: ctx.config,
          query: readStringParam(args, "query", { required: true }),
          count: readPositiveIntegerParam(args, "count", {
            max: 10,
            message: "count must be an integer from 1 to 10.",
          }),
          timeoutSeconds: ctx.searchConfig?.timeoutSeconds,
          cacheTtlMinutes: ctx.searchConfig?.cacheTtlMinutes,
        });
      },
    }),
  };
}
