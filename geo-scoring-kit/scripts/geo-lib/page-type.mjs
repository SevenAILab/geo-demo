// geo-lib/page-type.mjs — SPEC §2 页面类型判定
// 按 URL path（去尾 `/`，空则视为 `/`）从上到下匹配，命中即停。

function pathOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    // 允许直接传 path（非完整 URL）
    return (
      String(url || "/")
        .split(/[?#]/)[0]
        .replace(/\/+$/, "") || "/"
    );
  }
}

export function pageType(url, schemaTypes = "") {
  const p = pathOf(url);
  const has = (t) =>
    (schemaTypes || "")
      .split(",")
      .map((s) => s.trim())
      .includes(t);

  if (p === "/") return "homepage";
  if (["/contact", "/contact-us"].includes(p)) return "contact";
  if (["/about", "/about-us"].includes(p)) return "about";
  if (p.startsWith("/services") || has("Service")) return "service";
  if (p.startsWith("/blog") || has("Article") || has("BlogPosting")) return "blog";
  if (/\/vs-|-vs-|\/compare|comparison/.test(p)) return "comparison";

  const segs = p.split("/").filter(Boolean);
  if (segs.some((s) => /^\d+$/.test(s)) && segs.length > 2) return "programmatic";
  if ((p.match(/\//g) || []).length <= 2) return "landing";
  return "generic";
}

export { pathOf };
