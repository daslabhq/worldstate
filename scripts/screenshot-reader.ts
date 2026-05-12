#!/usr/bin/env bun
/**
 * Screenshot the Daslab Reader preview (a beautiful HIG-level render
 * of the Feed canonical type's mockState).
 *
 *   bun scripts/reader-preview.ts && bun scripts/screenshot-reader.ts
 *
 * Outputs:
 *   scripts/screenshots/reader-full.png
 *   scripts/screenshots/reader-viewport.png
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, "screenshots");
mkdirSync(OUT, { recursive: true });

const PORT = 7823;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--directory", HERE], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 600));

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 820, height: 1180 },   // iPad-ish for desktop reader
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/reader-preview.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  await page.screenshot({ path: join(OUT, "reader-viewport.png") });
  await page.screenshot({ path: join(OUT, "reader-full.png"), fullPage: true });

  // Phone viewport too — proves the responsive feel
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, "reader-phone.png"), fullPage: true });

  await browser.close();
  console.log(`✓ reader screenshots → ${OUT}`);
} finally {
  server.kill();
}
