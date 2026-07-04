#!/usr/bin/env node
// geo-crawl.mjs — 爬页面抽 SPEC §1 的 on-page 信号（复用 playwright）
// 产出可直接喂 geo-score.mjs 的页面信号对象数组。
// 用法: node geo-crawl.mjs https://example.com/ https://example.com/about [--json]
import path from "node:path";
import { fileURLToPath } from "node:url";

// 在浏览器上下文里抽信号（此函数被 page.evaluate 序列化执行）
function extractSignals() {
  const q = (sel) => Array.from(document.querySelectorAll(sel));
  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const meta = (name) =>
    document.querySelector(`meta[name="${name}"]`)?.content ||
    document.querySelector(`meta[property="${name}"]`)?.content ||
    "";

  const jsonLd = q('script[type="application/ld+json"]');
  const schemaTypes = new Set();
  for (const s of jsonLd) {
    try {
      const data = JSON.parse(s.textContent);
      const arr = Array.isArray(data) ? data : [data];
      for (const d of arr) {
        const t = d["@type"];
        if (Array.isArray(t)) t.forEach((x) => schemaTypes.add(x));
        else if (t) schemaTypes.add(t);
      }
    } catch {
      /* 忽略坏 JSON-LD */
    }
  }

  const headings = q("h2, h3").map((h) => txt(h));
  const questionHeadings = q("h1,h2,h3").filter((h) =>
    /[?？]|^(what|how|why|when|where|who|是什么|如何|怎么|为什么)/i.test(txt(h)),
  );
  const firstP = txt(q("p").find((p) => txt(p).length > 0));
  const bodyText = txt(document.body);
  const host = location.hostname;

  return {
    url: location.href,
    status: "ok",
    canonical: !!document.querySelector('link[rel="canonical"]'),
    is_noindex: /noindex/i.test(meta("robots")),
    title: !!document.title,
    meta_description: !!meta("description"),
    h1: q("h1").length > 0,
    og_title: !!meta("og:title"),
    og_description: !!meta("og:description"),
    word_count: bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0,
    h2_count: q("h2").length,
    h3_count: q("h3").length,
    list_count: q("ul, ol").length,
    table_count: q("table").length,
    internal_link_count: q("a[href]").filter((a) => {
      try {
        return new URL(a.href).hostname === host;
      } catch {
        return false;
      }
    }).length,
    external_link_count: q("a[href]").filter((a) => {
      try {
        return new URL(a.href).hostname !== host;
      } catch {
        return false;
      }
    }).length,
    question_heading_count: questionHeadings.length,
    first_paragraph_words: firstP ? firstP.split(/\s+/).filter(Boolean).length : 0,
    has_definition_block: /(是指|定义为|refers to|is a|is an)\b/i.test(bodyText.slice(0, 4000)),
    has_faq_section: schemaTypes.has("FAQPage") || /faq|常见问题|frequently asked/i.test(bodyText),
    has_comparison_table: q("table").some((t) => /vs|对比|comparison|versus/i.test(txt(t))),
    has_author_signal: !!(
      meta("author") || document.querySelector('[rel="author"], .author, [itemprop="author"]')
    ),
    has_last_updated:
      /(updated|最后更新|last modified|更新于)/i.test(bodyText) || !!meta("article:modified_time"),
    has_json_ld: jsonLd.length > 0,
    schema_types: Array.from(schemaTypes).join(","),
    hreflang_count: q('link[rel="alternate"][hreflang]').length,
  };
}

export async function crawl(urls, { width = 1280, height = 800 } = {}) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "playwright 未安装。运行: npm install -D playwright && npx playwright install chromium",
    );
  }
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const url of urls) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        out.push(await page.evaluate(extractSignals));
      } catch (e) {
        out.push({ url, status: "error", error: e.message });
      } finally {
        await page.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

async function cliMain() {
  const urls = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!urls.length) {
    console.error("Usage: node geo-crawl.mjs <url> [url...] [--json]");
    process.exit(2);
  }
  const signals = await crawl(urls);
  console.log(JSON.stringify(signals, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
