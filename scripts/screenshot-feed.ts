#!/usr/bin/env bun
/**
 * Screenshot the Feed canonical type's renders from the gallery.
 * Used to iterate on visual quality.
 *
 *   bun gallery/build.ts && bun scripts/screenshot-feed.ts
 *
 * Output: scripts/screenshots/feed-*.png
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, "screenshots");
mkdirSync(OUT, { recursive: true });

const GALLERY_DIR = join(HERE, "..", "gallery");
const PORT = 7822;

const server = spawn("python3", ["-m", "http.server", String(PORT), "--directory", GALLERY_DIR], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 600));

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html#feed`, { waitUntil: "networkidle" });

  // Screenshot each canonical type's section side-by-side to compare visual design.
  for (const id of ["email", "event", "task", "feed"]) {
    const section = page.locator(`#${id}`);
    if (await section.count() === 0) continue;
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await section.screenshot({ path: join(OUT, `${id}.png`) });
  }

  // Full-page for context
  await page.screenshot({ path: join(OUT, "gallery-full.png"), fullPage: true });

  await browser.close();
  console.log(`✓ screenshots → ${OUT}`);
} finally {
  server.kill();
}
