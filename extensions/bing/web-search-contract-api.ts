import type { WebSearchProviderPlugin } from "openclaw/plugin-sdk/provider-web-search-contract";
import { createBingWebSearchProviderBase } from "./src/bing-search-provider.shared.js";

export function createBingWebSearchProvider(): WebSearchProviderPlugin {
  return {
    ...createBingWebSearchProviderBase(),
    createTool: () => null,
  };
}
