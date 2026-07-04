#!/usr/bin/env node
// Bundle-size budget gate (issue #17). Gzips the production JS in build/ and
// compares against scripts/bundle-budget.json. Zero dependencies and no
// secrets, so it runs on every PR including forks.
//
//   node scripts/check-bundle-size.mjs             # table + exit 1 on breach
//   node scripts/check-bundle-size.mjs --markdown  # markdown table (PR comment)
//   node scripts/check-bundle-size.mjs --json      # machine-readable
//
// Only JS is gated: CSS and the self-hosted woff2 fonts are reported
// informationally (they're cache-friendly static assets, and the fontsource
// files are unicode-range-subset so only latin is fetched at runtime).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(root, "build");
const assetsDir = join(buildDir, "assets");
const budgetPath = join(root, "scripts", "bundle-budget.json");

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const asMarkdown = args.has("--markdown");

function fail(message) {
  console.error(message);
  process.exit(1);
}

let budget;
try {
  budget = JSON.parse(readFileSync(budgetPath, "utf8"));
} catch {
  fail(`Missing or invalid ${budgetPath}`);
}

let indexHtml;
try {
  indexHtml = readFileSync(join(buildDir, "index.html"), "utf8");
} catch {
  fail("build/index.html not found — run `npm run build` first.");
}

// The entry chunk is whatever index.html loads as a module script.
const entryMatch = indexHtml.match(/src="\/?(assets\/[^"]+\.js)"/);
const entryName = entryMatch?.[1]?.replace(/^assets\//, "") ?? null;

const gzipKb = (path) => Math.round((gzipSync(readFileSync(path)).length / 1024) * 10) / 10;
const rawKb = (path) => Math.round((statSync(path).size / 1024) * 10) / 10;

const files = readdirSync(assetsDir);
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
const fonts = files.filter((f) => f.endsWith(".woff2"));

const jsRows = js.map((f) => ({
  file: f,
  rawKb: rawKb(join(assetsDir, f)),
  gzipKb: gzipKb(join(assetsDir, f)),
  entry: f === entryName,
}));

const entryGzipKb = jsRows.filter((r) => r.entry).reduce((a, r) => a + r.gzipKb, 0);
const totalJsGzipKb = Math.round(jsRows.reduce((a, r) => a + r.gzipKb, 0) * 10) / 10;
const cssGzipKb = Math.round(css.reduce((a, f) => a + gzipKb(join(assetsDir, f)), 0) * 10) / 10;
const fontsRawKb = Math.round(fonts.reduce((a, f) => a + rawKb(join(assetsDir, f)), 0) * 10) / 10;

const breaches = [];
if (entryName === null) breaches.push("Could not identify the entry chunk from build/index.html");
if (entryGzipKb > budget.entryGzipKb) {
  breaches.push(`Entry chunk ${entryGzipKb} kB gzip exceeds budget ${budget.entryGzipKb} kB`);
}
if (totalJsGzipKb > budget.totalJsGzipKb) {
  breaches.push(`Total JS ${totalJsGzipKb} kB gzip exceeds budget ${budget.totalJsGzipKb} kB`);
}

const summary = {
  entryChunk: entryName,
  entryGzipKb,
  totalJsGzipKb,
  cssGzipKb,
  fontsRawKb,
  budget,
  headroom: {
    entryKb: Math.round((budget.entryGzipKb - entryGzipKb) * 10) / 10,
    totalJsKb: Math.round((budget.totalJsGzipKb - totalJsGzipKb) * 10) / 10,
  },
  breaches,
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else if (asMarkdown) {
  console.log("### Bundle size");
  console.log("");
  console.log("| Metric | Size (gzip) | Budget | Headroom |");
  console.log("| --- | ---: | ---: | ---: |");
  console.log(
    `| Entry chunk | ${entryGzipKb} kB | ${budget.entryGzipKb} kB | ${summary.headroom.entryKb} kB |`,
  );
  console.log(
    `| Total JS | ${totalJsGzipKb} kB | ${budget.totalJsGzipKb} kB | ${summary.headroom.totalJsKb} kB |`,
  );
  console.log(`| CSS (info) | ${cssGzipKb} kB | — | — |`);
  console.log(`| Fonts woff2, raw (info) | ${fontsRawKb} kB | — | — |`);
  if (breaches.length > 0) {
    console.log("");
    console.log(`⚠️ **Budget exceeded:** ${breaches.join("; ")}`);
  }
} else {
  console.log(`Entry chunk (${entryName}): ${entryGzipKb} kB gzip (budget ${budget.entryGzipKb})`);
  console.log(`Total JS: ${totalJsGzipKb} kB gzip (budget ${budget.totalJsGzipKb})`);
  console.log(`CSS: ${cssGzipKb} kB gzip · Fonts: ${fontsRawKb} kB raw (informational)`);
  for (const row of jsRows.sort((a, b) => b.gzipKb - a.gzipKb).slice(0, 10)) {
    console.log(`  ${row.entry ? "▸" : " "} ${row.file}: ${row.gzipKb} kB gzip (${row.rawKb} raw)`);
  }
}

// The markdown/json modes are for reporting (the PR comment step) and must
// not fail the job — the dedicated gate step runs the default mode.
if (!asMarkdown && !asJson && breaches.length > 0) {
  fail(breaches.map((b) => `ERROR: ${b}`).join("\n"));
}
