import path from "node:path";
import { fileURLToPath } from "node:url";

import { toSafeImportPath } from "./import-specifier.js";

export { toSafeImportPath as toSafeRuntimeImportPath } from "./import-specifier.js";

const GATEWAY_BUNDLE_BASENAME = "gateway-bundle.mjs";

/** Resolves a runtime import part against a base URL/path after platform-safe normalization. */
export function resolveRuntimeImportSpecifier(baseUrl: string, parts: readonly string[]): string {
  const joined = parts.join("");
  const safeJoined = toSafeImportPath(joined);
  if (safeJoined !== joined) {
    return safeJoined;
  }
  const safeBase = toSafeImportPath(baseUrl);
  if (joined.startsWith("./")) {
    try {
      const basePath = fileURLToPath(safeBase);
      if (path.basename(basePath) === GATEWAY_BUNDLE_BASENAME) {
        return new URL(`./dist/${joined.slice(2)}`, safeBase).href;
      }
    } catch {
      // Keep default URL resolution for non-file URLs and malformed bases.
    }
  }
  return new URL(joined, safeBase).href;
}

/** Imports a lazy runtime module through the normalized runtime specifier. */
export async function importRuntimeModule<T>(
  baseUrl: string,
  parts: readonly string[],
  importModule: (specifier: string) => Promise<unknown> = (specifier) => import(specifier),
): Promise<T> {
  return (await importModule(resolveRuntimeImportSpecifier(baseUrl, parts))) as T;
}
