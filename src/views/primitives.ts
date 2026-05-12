/**
 * Built-in view primitives — generic shapes most asset states reduce to.
 *
 * Each primitive ships HTML + Markdown + Text out of the box. Higher-level
 * asset views (gmail-inbox, salesforce-contact, etc.) compose these.
 */

import { defineView, escapeHtml, truncate, type ViewDef } from "../view.js";

// ---------------------------------------------------------------------------
// Table — array of objects with consistent keys
// ---------------------------------------------------------------------------

export interface TableProps {
  rows:     Array<Record<string, unknown>>;
  columns?: string[];
  title?:   string;
  empty?:   string;
}

export const TableView: ViewDef<TableProps> = defineView<TableProps>({
  name: "Table",
  description: "Render an array of objects as headers + rows.",
  toHTML(p) {
    const cols = p.columns ?? (p.rows[0] ? Object.keys(p.rows[0]) : []);
    if (p.rows.length === 0) return `<div class="ws-empty">${escapeHtml(p.empty ?? "—")}</div>`;
    const head = cols.map(c => `<th>${escapeHtml(c)}</th>`).join("");
    const body = p.rows.slice(0, 50).map(r =>
      `<tr>${cols.map(c => `<td>${escapeHtml(formatCell(r[c]))}</td>`).join("")}</tr>`
    ).join("");
    const more = p.rows.length > 50 ? `<tr><td colspan="${cols.length}" class="ws-more">… ${p.rows.length - 50} more rows</td></tr>` : "";
    return `<div class="ws-table">${p.title ? `<div class="ws-title">${escapeHtml(p.title)}</div>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${body}${more}</tbody></table></div>`;
  },
  toMarkdown(p) {
    const cols = p.columns ?? (p.rows[0] ? Object.keys(p.rows[0]) : []);
    if (p.rows.length === 0) return p.title ? `**${p.title}**: ${p.empty ?? "(empty)"}` : (p.empty ?? "(empty)");
    const head = `| ${cols.join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |`;
    const body = p.rows.slice(0, 30).map(r =>
      `| ${cols.map(c => formatCell(r[c]).replace(/\|/g, "\\|")).join(" | ")} |`
    ).join("\n");
    const more = p.rows.length > 30 ? `\n_… ${p.rows.length - 30} more rows_` : "";
    return `${p.title ? `**${p.title}**\n\n` : ""}${head}\n${body}${more}`;
  },
});

// ---------------------------------------------------------------------------
// Metric — single number + label
// ---------------------------------------------------------------------------

export interface MetricProps {
  value: number | string;
  label: string;
  delta?: string;     // "+12.4%" or "-3"
  trend?: "up" | "down" | "flat";
  unit?: string;
}

export const MetricView: ViewDef<MetricProps> = defineView<MetricProps>({
  name: "Metric",
  description: "Render a single value with a label and optional delta.",
  toHTML(p) {
    const arrow = p.trend === "up" ? "▲" : p.trend === "down" ? "▼" : p.trend === "flat" ? "→" : "";
    const trendCls = p.trend === "up" ? "ws-up" : p.trend === "down" ? "ws-down" : "ws-flat";
    return `<div class="ws-metric">
      <div class="ws-metric-value">${escapeHtml(p.value)}${p.unit ? `<span class="ws-unit">${escapeHtml(p.unit)}</span>` : ""}</div>
      <div class="ws-metric-label">${escapeHtml(p.label)}</div>
      ${p.delta ? `<div class="ws-delta ${trendCls}">${arrow} ${escapeHtml(p.delta)}</div>` : ""}
    </div>`;
  },
  toMarkdown(p) {
    const arrow = p.trend === "up" ? "↑" : p.trend === "down" ? "↓" : "";
    return `**${p.label}**: ${p.value}${p.unit ? ` ${p.unit}` : ""}${p.delta ? ` (${arrow} ${p.delta})` : ""}`;
  },
});

// ---------------------------------------------------------------------------
// List — flat list of items (with optional title/subtitle/badge)
// ---------------------------------------------------------------------------

export interface ListItem {
  title:    string;
  subtitle?: string;
  detail?:  string;
  badge?:   string;
}

export interface ListProps {
  items: ListItem[];
  title?: string;
  empty?: string;
}

export const ListView: ViewDef<ListProps> = defineView<ListProps>({
  name: "List",
  description: "Render a flat list of items with title + optional subtitle/badge.",
  toHTML(p) {
    if (p.items.length === 0) return `<div class="ws-empty">${escapeHtml(p.empty ?? "—")}</div>`;
    const items = p.items.slice(0, 30).map(i =>
      `<li class="ws-li">
        <div class="ws-li-row">
          <span class="ws-li-title">${escapeHtml(i.title)}</span>
          ${i.badge ? `<span class="ws-badge">${escapeHtml(i.badge)}</span>` : ""}
        </div>
        ${i.subtitle ? `<div class="ws-li-sub">${escapeHtml(i.subtitle)}</div>` : ""}
        ${i.detail ? `<div class="ws-li-detail">${escapeHtml(i.detail)}</div>` : ""}
      </li>`
    ).join("");
    const more = p.items.length > 30 ? `<li class="ws-more">… ${p.items.length - 30} more</li>` : "";
    return `<div class="ws-list">${p.title ? `<div class="ws-title">${escapeHtml(p.title)}</div>` : ""}<ul>${items}${more}</ul></div>`;
  },
  toMarkdown(p) {
    if (p.items.length === 0) return p.title ? `**${p.title}**: ${p.empty ?? "(empty)"}` : "(empty)";
    const lines = p.items.slice(0, 30).map(i => {
      const badge = i.badge ? ` \`${i.badge}\`` : "";
      const sub = i.subtitle ? ` — ${i.subtitle}` : "";
      return `- **${i.title}**${badge}${sub}`;
    }).join("\n");
    const more = p.items.length > 30 ? `\n_… ${p.items.length - 30} more_` : "";
    return `${p.title ? `**${p.title}**\n\n` : ""}${lines}${more}`;
  },
});

// ---------------------------------------------------------------------------
// KeyValue — label/value pairs
// ---------------------------------------------------------------------------

export interface KeyValueProps {
  pairs: Array<{ key: string; value: string }>;
  title?: string;
}

export const KeyValueView: ViewDef<KeyValueProps> = defineView<KeyValueProps>({
  name: "KeyValue",
  description: "Render label/value pairs.",
  toHTML(p) {
    const rows = p.pairs.map(({ key, value }) =>
      `<div class="ws-kv-row"><span class="ws-kv-key">${escapeHtml(key)}</span><span class="ws-kv-val">${escapeHtml(value)}</span></div>`
    ).join("");
    return `<div class="ws-kv">${p.title ? `<div class="ws-title">${escapeHtml(p.title)}</div>` : ""}${rows}</div>`;
  },
  toMarkdown(p) {
    const lines = p.pairs.map(({ key, value }) => `- **${key}**: ${value}`).join("\n");
    return `${p.title ? `**${p.title}**\n\n` : ""}${lines}`;
  },
});

// ---------------------------------------------------------------------------
// Status — pass / warn / fail with message
// ---------------------------------------------------------------------------

export interface StatusProps {
  state:    "ok" | "warn" | "fail";
  message:  string;
  details?: Array<{ key: string; value: string }>;
}

export const StatusView: ViewDef<StatusProps> = defineView<StatusProps>({
  name: "Status",
  toHTML(p) {
    const cls   = p.state === "ok" ? "ws-status-ok" : p.state === "warn" ? "ws-status-warn" : "ws-status-fail";
    const icon  = p.state === "ok" ? "✓" : p.state === "warn" ? "!" : "✗";
    const det   = p.details?.length
      ? `<div class="ws-status-details">${p.details.map(d => `<div><span class="ws-kv-key">${escapeHtml(d.key)}</span><span>${escapeHtml(d.value)}</span></div>`).join("")}</div>`
      : "";
    return `<div class="ws-status ${cls}"><div class="ws-status-icon">${icon}</div><div class="ws-status-msg">${escapeHtml(p.message)}</div>${det}</div>`;
  },
  toMarkdown(p) {
    const icon = p.state === "ok" ? "✓" : p.state === "warn" ? "⚠️" : "✗";
    const det  = p.details?.length ? "\n" + p.details.map(d => `- **${d.key}**: ${d.value}`).join("\n") : "";
    return `${icon} **${p.message}**${det}`;
  },
});

// ---------------------------------------------------------------------------
// Document — body text with optional title + meta
// ---------------------------------------------------------------------------

export interface DocumentProps {
  title?:   string;
  body:     string;
  byline?:  string;
  meta?:    string;
}

export const DocumentView: ViewDef<DocumentProps> = defineView<DocumentProps>({
  name: "Document",
  toHTML(p) {
    const words = p.body.split(/\s+/).length;
    return `<div class="ws-doc">
      ${p.title ? `<div class="ws-doc-title">${escapeHtml(p.title)}</div>` : ""}
      ${p.byline ? `<div class="ws-doc-byline">${escapeHtml(p.byline)}</div>` : ""}
      ${p.meta ? `<div class="ws-doc-meta">${escapeHtml(p.meta)}</div>` : ""}
      <div class="ws-doc-body">${escapeHtml(p.body)}</div>
      <div class="ws-doc-stats">${words} words · ~${Math.max(1, Math.round(words / 200))} min read</div>
    </div>`;
  },
  toMarkdown(p) {
    return `${p.title ? `### ${p.title}\n\n` : ""}${p.byline ? `_${p.byline}_\n\n` : ""}${truncate(p.body, 600)}`;
  },
});

// ---------------------------------------------------------------------------
// Calendar — list of events (compact)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  title:      string;
  start:      string;
  end?:       string;
  location?:  string;
  attendees?: string[];
  allDay?:    boolean;
}

export interface CalendarProps {
  events: CalendarEvent[];
  title?: string;
}

export const CalendarView: ViewDef<CalendarProps> = defineView<CalendarProps>({
  name: "Calendar",
  toHTML(p) {
    if (p.events.length === 0) return `<div class="ws-empty">No events</div>`;
    const rows = p.events.slice(0, 20).map(e =>
      `<div class="ws-cal-row">
        <div class="ws-cal-time">${escapeHtml(formatDateRange(e.start, e.end, e.allDay))}</div>
        <div class="ws-cal-body">
          <div class="ws-cal-title">${escapeHtml(e.title)}</div>
          ${e.location ? `<div class="ws-cal-loc">📍 ${escapeHtml(e.location)}</div>` : ""}
          ${e.attendees?.length ? `<div class="ws-cal-att">${escapeHtml(e.attendees.slice(0,3).join(", "))}${e.attendees.length > 3 ? ` +${e.attendees.length - 3}` : ""}</div>` : ""}
        </div>
      </div>`
    ).join("");
    return `<div class="ws-cal">${p.title ? `<div class="ws-title">${escapeHtml(p.title)}</div>` : ""}${rows}</div>`;
  },
  toMarkdown(p) {
    if (p.events.length === 0) return p.title ? `**${p.title}**: no events` : "no events";
    const lines = p.events.slice(0, 20).map(e => {
      const time = formatDateRange(e.start, e.end, e.allDay);
      const loc  = e.location ? ` · ${e.location}` : "";
      return `- **${time}** — ${e.title}${loc}`;
    }).join("\n");
    return `${p.title ? `**${p.title}**\n\n` : ""}${lines}`;
  },
});

// ---------------------------------------------------------------------------
// Image — single asset
// ---------------------------------------------------------------------------

export interface ImageProps {
  url: string;
  alt?: string;
  caption?: string;
}

export const ImageView: ViewDef<ImageProps> = defineView<ImageProps>({
  name: "Image",
  toHTML(p) {
    return `<figure class="ws-img">
      <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.alt ?? "")}" loading="lazy" />
      ${p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : ""}
    </figure>`;
  },
  toMarkdown(p) {
    return `![${p.alt ?? ""}](${p.url})${p.caption ? `\n_${p.caption}_` : ""}`;
  },
});

// ---------------------------------------------------------------------------
// Plan — ordered checklist of steps with status
// ---------------------------------------------------------------------------

export interface PlanStep {
  label:   string;
  status:  "pending" | "in_progress" | "completed" | "failed" | "skipped";
  detail?: string;
}

export interface PlanProps {
  title:  string;
  steps:  PlanStep[];
}

export const PlanView: ViewDef<PlanProps> = defineView<PlanProps>({
  name: "Plan",
  toHTML(p) {
    const mark = (s: PlanStep["status"]) => ({
      pending: "○", in_progress: "◐", completed: "●", failed: "✗", skipped: "⊘",
    })[s];
    const cls  = (s: PlanStep["status"]) => `ws-plan-${s}`;
    return `<div class="ws-plan"><div class="ws-title">${escapeHtml(p.title)}</div>${p.steps.map(s =>
      `<div class="ws-plan-row ${cls(s.status)}">
        <span class="ws-plan-mark">${mark(s.status)}</span>
        <div>
          <div class="ws-plan-label">${escapeHtml(s.label)}</div>
          ${s.detail ? `<div class="ws-plan-detail">${escapeHtml(s.detail)}</div>` : ""}
        </div>
      </div>`
    ).join("")}</div>`;
  },
  toMarkdown(p) {
    const mark = (s: PlanStep["status"]) => ({
      pending: "[ ]", in_progress: "[~]", completed: "[x]", failed: "[!]", skipped: "[-]",
    })[s];
    return `**${p.title}**\n\n` + p.steps.map(s => `- ${mark(s.status)} ${s.label}${s.detail ? ` — ${s.detail}` : ""}`).join("\n");
  },
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return truncate(v, 80);
  if (typeof v === "object") return truncate(JSON.stringify(v), 80);
  return String(v);
}

function formatDateRange(start: string, end?: string, allDay?: boolean): string {
  if (allDay) return formatDate(start);
  const s = formatDateTime(start);
  if (!end) return s;
  return `${s} → ${formatTime(end)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
