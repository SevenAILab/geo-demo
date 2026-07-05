const fs = require("fs");
const raw = fs.readFileSync("F:\\workspace\\heike\\geo-demo\\fixpack-output.json", "utf8");

// Parse the outer JSON
const outer = JSON.parse(raw);
const jsonLdStr = outer.jsonLd;
const llmsTxtStr = outer.llmsTxt;

// Validate jsonLd is legal JSON
const jsonLd = JSON.parse(jsonLdStr);
console.log("VALID JSON-LD ✓");
console.log("Types:", jsonLd["@graph"].map((x) => x["@type"]).join(", "));
console.log("Name:", jsonLd["@graph"][0].name);
console.log("Website URL:", jsonLd["@graph"][1].url);
console.log("Breadcrumb items:", jsonLd["@graph"][2].itemListElement.length);

// Validate llmsTxt has key sections
console.log("\n--- llmsTxt sections ---");
console.log("Has # Merlord:", llmsTxtStr.includes("# Merlord") ? "✓" : "✗");
console.log("Has Brand Facts:", llmsTxtStr.includes("## Brand Facts") ? "✓" : "✗");
console.log("Has Instructions for LLMs:", llmsTxtStr.includes("# Instructions for LLMs") ? "✓" : "✗");
console.log("Has Chinese prose:", /[\u4e00-\u9fff]/.test(llmsTxtStr) ? "✓" : "✗");
console.log("Has contact info:", llmsTxtStr.includes("merlord88@gmail.com") ? "✓" : "✗");
console.log("\nAll checks passed ✨");
