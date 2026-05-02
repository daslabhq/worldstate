/**
 * Build the gallery — a single static HTML page showing every asset's
 * default view rendered to HTML + Markdown side-by-side, using the
 * built-in mockState() factories.
 *
 *   bun gallery/build.ts
 *
 * Output:
 *   gallery/index.html
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { assets } from "../src/index.js";
import { escapeHtml } from "../src/view.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = join(HERE, "index.html");

interface Card {
  name:     string;
  type:     string;
  desc:     string;
  viewName: string;
  html:     string;
  markdown: string;
}

const cards: Card[] = [];
for (const [name, asset] of Object.entries(assets)) {
  const state = asset.mockState!();
  cards.push({
    name,
    type:     asset.type,
    desc:     asset.description ?? "",
    viewName: asset.defaultView.name,
    html:     asset.defaultView.toHTML(state),
    markdown: asset.defaultView.toMarkdown(state),
  });
}

const css = `
:root {
  --fg: #0f172a; --muted: #64748b; --border: #e2e8f0; --bg: #f8fafc;
  --accent: #6366f1; --amber: #f59e0b; --green: #10b981; --red: #ef4444;
  --card-bg: #ffffff;
}
* { box-sizing: border-box; }
body { margin:0; font-family: ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--fg); background: var(--bg); }
.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
header { border-bottom: 1px solid var(--border); background: white; }
.header-inner { max-width: 1400px; margin: 0 auto; padding: 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap: wrap; }
.brand { font-size: 22px; font-weight: 700; }
.brand small { font-weight: 400; color: var(--muted); margin-left: 8px; }
.subtitle { color: var(--muted); margin-top: 4px; font-size: 14px; }
.gh-link { font-size: 14px; color: var(--muted); text-decoration: none; }
.gh-link:hover { color: var(--fg); text-decoration: underline; }
main { max-width: 1400px; margin: 0 auto; padding: 32px 24px 80px; }
.intro { background: white; padding: 24px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 32px; }
.intro h2 { margin: 0 0 8px; font-size: 18px; }
.intro p { margin: 6px 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
.intro code { background: #eef2ff; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.toc { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.toc a { padding: 4px 10px; background: var(--bg); border-radius: 999px; font-size: 12px; text-decoration: none; color: var(--fg); border: 1px solid var(--border); }
.toc a:hover { background: var(--accent); color: white; border-color: var(--accent); }
.card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 28px; overflow: hidden; }
.card-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.card-name { font-size: 18px; font-weight: 600; }
.card-meta { font-size: 12px; color: var(--muted); }
.card-meta .pill { background: #eef2ff; color: var(--accent); padding: 2px 8px; border-radius: 999px; font-weight: 500; }
.card-desc { color: var(--muted); font-size: 14px; margin-top: 4px; flex-basis: 100%; }
.split { display: grid; grid-template-columns: 1fr 1fr; }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; } }
.col { padding: 20px; }
.col + .col { border-left: 1px solid var(--border); }
@media (max-width: 900px) { .col + .col { border-left: none; border-top: 1px solid var(--border); } }
.col-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.col-label::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.md-pre { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px; line-height: 1.55; white-space: pre-wrap; overflow-x: auto; max-height: 560px; }
.md-pre .h { color: var(--accent); }

/* ----- view primitives ----- */
.ws-title { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
.ws-empty { color: var(--muted); font-style: italic; padding: 12px; }
.ws-more { color: var(--muted); font-style: italic; font-size: 12px; padding: 6px 0; }

.ws-table table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ws-table th { text-align: left; padding: 8px 10px; background: var(--bg); border-bottom: 1px solid var(--border); font-weight: 500; color: var(--muted); font-size: 12px; }
.ws-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.ws-table tr:last-child td { border-bottom: none; }

.ws-metric { text-align: left; padding: 14px; background: var(--bg); border-radius: 8px; }
.ws-metric-value { font-size: 26px; font-weight: 700; line-height: 1.1; }
.ws-metric-value .ws-unit { font-size: 14px; font-weight: 400; color: var(--muted); margin-left: 4px; }
.ws-metric-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
.ws-delta { font-size: 12px; margin-top: 6px; }
.ws-up { color: var(--green); }
.ws-down { color: var(--red); }
.ws-flat { color: var(--muted); }

.ws-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
.ws-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }

.ws-list ul { margin: 0; padding: 0; list-style: none; }
.ws-li { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.ws-li:last-child { border-bottom: none; }
.ws-li-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ws-li-title { font-size: 14px; font-weight: 500; }
.ws-li-sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.ws-li-detail { font-size: 12.5px; color: #475569; margin-top: 4px; }
.ws-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--accent); color: white; padding: 2px 8px; border-radius: 999px; }

.ws-kv-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.ws-kv-row:last-child { border-bottom: none; }
.ws-kv-key { color: var(--muted); }
.ws-kv-val { font-weight: 500; }

.ws-cal { display: flex; flex-direction: column; gap: 8px; }
.ws-cal-row { display: grid; grid-template-columns: 220px 1fr; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.ws-cal-row:last-child { border-bottom: none; }
.ws-cal-time { color: var(--muted); font-size: 12.5px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
.ws-cal-title { font-size: 14px; font-weight: 500; }
.ws-cal-loc, .ws-cal-att { font-size: 12px; color: var(--muted); margin-top: 2px; }

.ws-status { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border-radius: 8px; }
.ws-status-ok { background: #ecfdf5; color: #065f46; }
.ws-status-warn { background: #fffbeb; color: #78350f; }
.ws-status-fail { background: #fef2f2; color: #7f1d1d; }
.ws-status-icon { font-size: 22px; font-weight: 700; }
.ws-status-msg { font-weight: 500; font-size: 14px; }
.ws-status-details { font-size: 12px; margin-top: 6px; }

.ws-doc-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.ws-doc-byline, .ws-doc-meta { color: var(--muted); font-size: 12.5px; }
.ws-doc-body { margin-top: 10px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
.ws-doc-stats { color: var(--muted); font-size: 11px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.05em; }

.ws-img img { max-width: 100%; border-radius: 6px; border: 1px solid var(--border); }
.ws-img figcaption { color: var(--muted); font-size: 12px; margin-top: 6px; }

.ws-plan-row { display: grid; grid-template-columns: 24px 1fr; gap: 8px; padding: 4px 0; }
.ws-plan-mark { color: var(--muted); font-size: 16px; }
.ws-plan-completed .ws-plan-mark { color: var(--green); }
.ws-plan-in_progress .ws-plan-mark { color: var(--accent); }
.ws-plan-failed .ws-plan-mark { color: var(--red); }
.ws-plan-label { font-size: 13px; }
.ws-plan-detail { font-size: 12px; color: var(--muted); }

footer { text-align: center; color: var(--muted); font-size: 12px; padding: 24px; }
footer a { color: var(--muted); }
`;

const mdSyntax = (md: string) =>
  escapeHtml(md)
    .replace(/^#{1,6} (.+)$/gm, '<span class="h">$&</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '• $1');

const cardHtml = (c: Card) => `
  <section class="card" id="${c.name.toLowerCase()}">
    <div class="card-head">
      <div>
        <div class="card-name">${escapeHtml(c.name)}</div>
        <div class="card-meta">
          <span class="pill">${escapeHtml(c.type)}</span>
          ·
          view: <span class="mono">${escapeHtml(c.viewName)}</span>
        </div>
        ${c.desc ? `<div class="card-desc">${escapeHtml(c.desc)}</div>` : ""}
      </div>
    </div>
    <div class="split">
      <div class="col">
        <div class="col-label">HTML — for humans, dashboards, scrubbers</div>
        ${c.html}
      </div>
      <div class="col">
        <div class="col-label">Markdown — for LLM context (token-efficient)</div>
        <pre class="md-pre">${mdSyntax(c.markdown)}</pre>
      </div>
    </div>
  </section>
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>scene-state · view gallery</title>
  <style>${css}</style>
</head>
<body>
  <header>
    <div class="header-inner">
      <div>
        <div class="brand">scene-state <small>· view gallery</small></div>
        <div class="subtitle">One asset definition · three rendering targets · the agent's view of the world.</div>
      </div>
      <a class="gh-link" href="https://github.com/daslabhq/scene-state">GitHub →</a>
    </div>
  </header>
  <main>
    <div class="intro">
      <h2>What you're looking at</h2>
      <p>Each card below is one <code>defineAsset()</code> declaration from the scene-state library. Every asset comes with a default <code>view</code> that renders the same state to <b>HTML</b> (left — the version humans see) and <b>Markdown</b> (right — the version an LLM sees in its context window).</p>
      <p>Same definition. Different consumers. The Markdown version is typically <b>3–5× cheaper in tokens</b> than dumping the raw JSON, while preserving the structure agents need to reason about.</p>
      <div class="toc">
        ${cards.map(c => `<a href="#${c.name.toLowerCase()}">${c.name}</a>`).join("")}
      </div>
    </div>
    ${cards.map(cardHtml).join("")}
  </main>
  <footer>
    scene-state · MIT · <a href="https://github.com/daslabhq/scene-state">github.com/daslabhq/scene-state</a> · ${cards.length} assets shown
  </footer>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`✓ wrote gallery → ${OUT.replace(process.cwd(), "")}  (${cards.length} assets, ${html.length.toLocaleString()} bytes)`);
