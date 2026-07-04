import { createWebSearchProviderContractFields } from "openclaw/plugin-sdk/provider-web-search-config-contract";

const BING_ONBOARDING_SCOPES: Array<"text-inference"> = ["text-inference"];

export function createBingWebSearchProviderBase() {
  return {
    id: "bing",
    label: "Bing Search",
    hint: "Free Bing web search via RSS with no API key required",
    onboardingScopes: [...BING_ONBOARDING_SCOPES],
    requiresCredential: false,
    envVars: [],
    placeholder: "(no key needed)",
    signupUrl: "https://www.bing.com/",
    docsUrl: "https://docs.openclaw.ai/tools/web",
    autoDetectOrder: 95,
    credentialPath: "",
    ...createWebSearchProviderContractFields({
      credentialPath: "",
      searchCredential: { type: "scoped", scopeId: "bing" },
      selectionPluginId: "bing",
    }),
  };
}
