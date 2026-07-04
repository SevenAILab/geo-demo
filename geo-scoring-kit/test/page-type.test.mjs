import assert from "node:assert/strict";
// SPEC §2 页面类型判定
import { test } from "node:test";
import { pageType } from "../scripts/geo-lib/page-type.mjs";

test("从上到下命中即停", () => {
  assert.equal(pageType("https://x.com/"), "homepage");
  assert.equal(pageType("https://x.com/contact"), "contact");
  assert.equal(pageType("https://x.com/about-us"), "about");
  assert.equal(pageType("https://x.com/services/geo"), "service");
  assert.equal(pageType("https://x.com/blog/post-1"), "blog");
  assert.equal(pageType("https://x.com/foo-vs-bar"), "comparison");
  assert.equal(pageType("https://x.com/p/123/456"), "programmatic");
  assert.equal(pageType("https://x.com/pricing"), "landing");
  assert.equal(pageType("https://x.com/a/b/c/d"), "generic");
});

test("schema 兜底判定 service / blog", () => {
  assert.equal(pageType("https://x.com/x/y/z", "Service"), "service");
  assert.equal(pageType("https://x.com/x/y/z", "BlogPosting"), "blog");
});

test("去尾斜杠、空 path 视为 /", () => {
  assert.equal(pageType("https://x.com"), "homepage");
  assert.equal(pageType("https://x.com/contact/"), "contact");
});
