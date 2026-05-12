#!/usr/bin/env bun
/**
 * Render the Feed canonical type's mockState() to a beautifully-styled
 * standalone HTML page — proves the canonical type can drive HIG-level UX,
 * not just documentation-style gallery output.
 *
 * Output: scripts/reader-preview.html
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Feed, type FeedState, type FeedItem } from "../src/types/feed.js";

const HERE  = dirname(fileURLToPath(import.meta.url));
const OUT   = join(HERE, "reader-preview.html");
const state = (Feed as any).mockState() as FeedState;

const SOCIAL = new Set(["twitter", "bluesky", "linkedin", "mastodon", "threads"]);
const PLATFORM: Record<string, string> = {
  twitter: "X", bluesky: "Bluesky", linkedin: "LinkedIn", mastodon: "Mastodon", threads: "Threads",
};
const PERCENT_METRICS = new Set(["accuracy", "task_pass", "equivalence", "percentage", "pct"]);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}

interface Cluster { lead: FeedItem; coverage: FeedItem[]; commentary: Map<string, FeedItem[]>; }

function clusters(s: FeedState): Cluster[] {
  const groups = new Map<string, FeedItem[]>();
  const singles: FeedItem[] = [];
  for (const it of s.items) {
    if (it.cluster_id) {
      const arr = groups.get(it.cluster_id) ?? [];
      arr.push(it); groups.set(it.cluster_id, arr);
    } else singles.push(it);
  }
  const out: Cluster[] = [];
  for (const arr of groups.values()) {
    const lead = arr.reduce((a, b) => (a.importance ?? 0) >= (b.importance ?? 0) ? a : b);
    const rest = arr.filter(it => it !== lead);
    const coverage = rest.filter(it => !it.source_kind || !SOCIAL.has(it.source_kind));
    const commentary = new Map<string, FeedItem[]>();
    for (const it of rest.filter(it => it.source_kind && SOCIAL.has(it.source_kind))) {
      const list = commentary.get(it.source_kind!) ?? [];
      list.push(it); commentary.set(it.source_kind!, list);
    }
    out.push({ lead, coverage, commentary });
  }
  for (const it of singles) out.push({ lead: it, coverage: [], commentary: new Map() });
  return out.sort((a, b) => (b.lead.importance ?? 0) - (a.lead.importance ?? 0));
}

function renderScoreChip(item: FeedItem): string {
  if (item.score == null || !item.score_target) return "";
  const pct = item.score_metric && PERCENT_METRICS.has(item.score_metric);
  return `<span class="chip chip-score"><span class="chip-num">${item.score}${pct ? "%" : ""}</span> <span class="chip-target">${esc(item.score_target)}</span></span>`;
}

function renderHeroBadges(lead: FeedItem): string {
  const parts: string[] = [];
  if (lead.is_sota)    parts.push(`<span class="chip chip-sota">SOTA</span>`);
  if (lead.is_release) parts.push(`<span class="chip chip-release">RELEASE</span>`);
  if (lead.score != null && lead.score_target) parts.push(renderScoreChip(lead));
  return parts.length ? `<div class="hero-badges">${parts.join("")}</div>` : "";
}

function renderCluster(c: Cluster, idx: number): string {
  const { lead, coverage, commentary } = c;
  const byline = `${lead.author ? esc(lead.author) + " / " : ""}<span class="byline-source">${esc(lead.source)}</span>`;
  const thumbnail = ""; // could be lead.thumbnail
  const excerpt = lead.excerpt ? `<p class="excerpt">${esc(lead.excerpt)}</p>` : "";

  const moreBlock = coverage.length ? `
    <div class="related-group">
      <div class="related-label related-label-more">More</div>
      <ul class="related-list">
        ${coverage.map(it => `
          <li>
            <a class="related-link" href="${esc(it.url)}">${esc(it.title)}</a>
            <div class="related-meta">${it.author ? esc(it.author) + " / " : ""}<span class="related-source">${esc(it.source)}</span></div>
          </li>
        `).join("")}
      </ul>
    </div>` : "";

  const commentaryBlocks = [...commentary.entries()].map(([kind, items]) => `
    <div class="related-group">
      <div class="related-label related-label-${kind}">${PLATFORM[kind] ?? kind}</div>
      <ul class="commentary-list">
        ${items.map(it => `
          <li>
            <div class="commentary-author">${esc(it.source)}</div>
            <a class="commentary-body" href="${esc(it.url)}">${esc(it.title)}</a>
          </li>
        `).join("")}
      </ul>
    </div>
  `).join("");

  return `
    <article class="story" data-cluster="${idx}">
      <header class="story-head">
        <div class="byline">${byline}</div>
        <h2 class="headline"><a href="${esc(lead.url)}">${esc(lead.title)}</a></h2>
        ${renderHeroBadges(lead)}
        ${excerpt}
      </header>
      ${moreBlock}
      ${commentaryBlocks}
    </article>
  `;
}

const today = new Date(state.fetched_at ?? Date.now());
const todayLabel = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Daslab Reader — Feed preview</title>
<style>
:root {
  /* Dark theme matching techmemer iOS */
  --bg:           #04060a;
  --surface:      #0b1018;
  --surface-2:    #131922;
  --border:       #1c2330;
  --text:         #e5ecf2;
  --text-2:       #8a96a6;
  --text-3:       #5d6878;

  --accent:       #5cb3ff;   /* iOS blue */
  --accent-2:     #1f8fff;
  --green:        #34d27a;
  --teal:         #5ad9d3;
  --indigo:       #8fa6ff;
  --orange:       #ff9f43;
  --rose:         #ff5e7a;

  --more:         #34d27a;   /* techmemer's green More: label */
  --x:            #ffffff;
  --bluesky:      #5cb3ff;
  --linkedin:     #5fb0ff;
  --mastodon:     #b58cff;
  --threads:      #cfcfcf;

  --radius:       14px;
  --gap:          24px;
}

* { box-sizing: border-box; }
html, body { background: var(--bg); }
body {
  margin: 0;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.app {
  max-width: 740px;
  margin: 0 auto;
  padding: 24px 20px 140px;
}

/* ── Top bar ────────────────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 4px 8px;
}
.brand {
  display: flex; align-items: center; gap: 12px;
  font-size: 22px; font-weight: 700; letter-spacing: -0.01em;
}
.brand-mark {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--surface);
  display: grid; place-items: center;
  color: var(--accent);
}
.brand-mark svg { width: 22px; height: 22px; }
.topbar-actions {
  display: flex; gap: 8px;
  background: var(--surface);
  border-radius: 999px;
  padding: 6px 10px;
}
.topbar-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: transparent; border: 0;
  color: var(--accent);
  display: grid; place-items: center;
  cursor: pointer;
}
.topbar-btn:hover { background: var(--surface-2); }
.topbar-btn svg { width: 18px; height: 18px; }

/* ── Day header ─────────────────────────────────────────────────────────── */
.day {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 16px 4px 8px;
}
.day-sep {
  height: 1px; background: var(--border); margin: 12px 4px 28px;
}

/* ── Story ─────────────────────────────────────────────────────────────── */
.story {
  margin-bottom: 44px;
}
.story + .story {
  border-top: 1px solid var(--border);
  padding-top: 36px;
}

.byline {
  font-size: 14px;
  color: var(--text-2);
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}
.byline-source {
  color: var(--text-2);
  font-weight: 500;
}

.headline {
  font-size: 26px;
  line-height: 1.18;
  font-weight: 700;
  letter-spacing: -0.012em;
  margin: 0 0 10px;
}
.headline a {
  color: var(--accent);
  text-decoration: none;
}
.headline a:hover {
  text-decoration: underline;
}

.hero-badges {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin: 12px 0 14px;
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-2);
}
.chip-sota {
  background: linear-gradient(135deg, #ff9f43 0%, #ff5e7a 100%);
  color: #1a0f00;
}
.chip-release {
  background: var(--surface-2);
  color: var(--green);
  border: 1px solid #1f3a2a;
}
.chip-score {
  background: rgba(92, 179, 255, 0.12);
  color: var(--accent);
  border: 1px solid rgba(92, 179, 255, 0.22);
}
.chip-score .chip-num { font-weight: 700; font-size: 13px; }
.chip-score .chip-target { font-weight: 500; text-transform: lowercase; opacity: 0.85; }

.excerpt {
  font-size: 16px;
  color: var(--text-2);
  margin: 6px 0 0;
}

/* ── Related groups (More / X / Bluesky / LinkedIn) ────────────────────── */
.related-group {
  margin-top: 22px;
}
.related-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}
.related-label::before {
  content: "";
  width: 6px; height: 6px; border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}
.related-label-more     { color: var(--more); }
.related-label-twitter  { color: var(--x); }
.related-label-bluesky  { color: var(--bluesky); }
.related-label-linkedin { color: var(--linkedin); }
.related-label-mastodon { color: var(--mastodon); }
.related-label-threads  { color: var(--threads); }

.related-list, .commentary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* "More:" — compact, just title + source byline */
.related-list .related-link {
  color: var(--text);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  display: block;
}
.related-list .related-link:hover { color: var(--accent); }
.related-list .related-meta {
  font-size: 13px;
  color: var(--text-3);
  margin-top: 2px;
}
.related-source {
  color: var(--text-3);
  font-weight: 500;
}

/* Commentary — author chip + body text */
.commentary-list li {
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
}
.commentary-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
  margin-bottom: 6px;
}
.commentary-body {
  display: block;
  font-size: 15px;
  line-height: 1.45;
  color: var(--text);
  text-decoration: none;
}
.commentary-body:hover { color: var(--accent); }

/* ── Tabbar (iOS-style at bottom) ──────────────────────────────────────── */
.tabbar-fade {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: 140px;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(4,6,10,0) 0%, rgba(4,6,10,0.7) 40%, rgba(4,6,10,1) 100%);
  z-index: 1;
}
.tabbar {
  position: fixed;
  bottom: 20px;
  left: 50%; transform: translateX(-50%);
  display: flex; gap: 4px;
  padding: 8px;
  background: rgba(11, 16, 24, 0.82);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  z-index: 2;
}
.tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 88px; padding: 6px 0;
  font-size: 11px; font-weight: 500;
  color: var(--text-3);
  border-radius: 999px;
  text-decoration: none;
}
.tab.active { color: var(--accent); background: rgba(92, 179, 255, 0.08); }
.tab svg { width: 22px; height: 22px; margin-bottom: 2px; }

</style>
</head>
<body>
<div class="app">

  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"/>
        </svg>
      </div>
      Daslab
    </div>
    <div class="topbar-actions">
      <button class="topbar-btn" aria-label="Font">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
      </button>
      <button class="topbar-btn" aria-label="Date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>
        </svg>
      </button>
    </div>
  </header>

  <h1 class="day">${todayLabel}</h1>
  <div class="day-sep"></div>

  ${clusters(state).map((c, i) => renderCluster(c, i)).join("")}

</div>

<div class="tabbar-fade"></div>
<nav class="tabbar">
  <a class="tab active" href="#">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z M4 9h16 M9 9v11"/></svg>
    Stories
  </a>
  <a class="tab" href="#">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    Bookmarks
  </a>
  <a class="tab" href="#">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8v8M10 5v14M14 8v8M18 11v2"/></svg>
    Podcast
  </a>
</nav>

</body>
</html>`;

writeFileSync(OUT, html);
console.log(`✓ wrote ${OUT}`);
