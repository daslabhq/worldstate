#!/usr/bin/env bun
/**
 * Screenshot the MCP Apps iframe column for every canonical type in the
 * gallery. Used to diagnose render bugs.
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE   = dirname(fileURLToPath(import.meta.url));
const OUT    = join(HERE, "screenshots", "mcp");
mkdirSync(OUT, { recursive: true });
const PORT   = 7824;

const server = spawn("python3", ["-m", "http.server", String(PORT), "--directory", join(HERE, "..", "gallery")], { stdio: "ignore" });
await new Promise(r => setTimeout(r, 600));

try {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1500, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  page.on("console",   m => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text()); });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  for (const id of ["email", "message", "contact", "event", "task", "document", "mesh", "feed"]) {
    const section = page.locator(`#${id}`);
    if (await section.count() === 0) continue;
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const mcpCol = section.locator(".col-mcp");
    if (await mcpCol.count() === 0) continue;
    await mcpCol.screenshot({ path: join(OUT, `${id}.png`) });
  }
  await browser.close();
  console.log(`✓ MCP screenshots → ${OUT}`);
} finally {
  server.kill();
}
