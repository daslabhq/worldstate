#!/usr/bin/env bun
/**
 * Screenshot a single canonical type's whole section (top + medium row)
 * for visual inspection. Usage:
 *   bun scripts/screenshot-section.ts contact
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE   = dirname(fileURLToPath(import.meta.url));
const OUT    = join(HERE, "screenshots", "sections");
mkdirSync(OUT, { recursive: true });
const id     = process.argv[2] ?? "contact";
const PORT   = 7825;

const server = spawn("python3", ["-m", "http.server", String(PORT), "--directory", join(HERE, "..", "gallery")], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 600));

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html#${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const section = page.locator(`#${id}`);
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await section.screenshot({ path: join(OUT, `${id}.png`) });
  await browser.close();
  console.log(`✓ ${id} → ${OUT}/${id}.png`);
} finally {
  server.kill();
}
