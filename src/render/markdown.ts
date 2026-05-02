/**
 * renderMarkdown(WidgetData) → Markdown string.
 *
 * Token-efficient summaries for LLM context. Same source-of-truth JSON as
 * the HTML renderer, just a different output target.
 */

import type {
  WidgetData, IconWidget, StackWidget, ListWidget, TableWidget,
  MetricWidget, MetricGridWidget, KeyValueWidget, StatusWidget,
  DocumentWidget, CalendarWidget, PlanWidget, EmptyWidget,
} from "../widgets.js";
import { truncate } from "../view.js";

export function renderMarkdown(w: WidgetData): string {
  switch (w.type) {
    case "icon":        return renderIcon(w);
    case "stack":       return renderStack(w);
    case "list":        return renderList(w);
    case "table":       return renderTable(w);
    case "metric":      return renderMetric(w);
    case "metric_grid": return renderMetricGrid(w);
    case "key_value":   return renderKeyValue(w);
    case "status":      return renderStatus(w);
    case "document":    return renderDocument(w);
    case "calendar":    return renderCalendar(w);
    case "plan":        return renderPlan(w);
    case "empty":       return renderEmpty(w);
  }
}

const COLOR_EMOJI: Record<string, string> = {
  blue: "🔵", green: "🟢", purple: "🟣", red: "🔴",
  orange: "🟠", yellow: "🟡", indigo: "🟣", pink: "🩷",
  teal: "🔷", gray: "⚪️",
};

function renderIcon(w: IconWidget): string {
  const dot = COLOR_EMOJI[w.color] ?? "";
  return `${dot} **${w.label}**${w.badge ? ` · ${w.badge}` : ""}`;
}

function renderStack(w: StackWidget): string {
  const head = w.header
    ? `**${w.header.title}**${w.header.meta ? ` · ${w.header.meta}` : ""}\n\n`
    : "";
  const body = w.body.map(renderMarkdown).join("\n\n");
  return head + body;
}

function renderList(w: ListWidget): string {
  if (w.items.length === 0) {
    return w.title ? `**${w.title}**: ${w.empty ?? "(empty)"}` : (w.empty ?? "(empty)");
  }
  const lines = w.items.slice(0, 30).map(i => {
    const badge = i.badge ? ` \`${i.badge}\`` : "";
    const sub = i.subtitle ? ` — ${i.subtitle}` : "";
    const det = i.detail ? `\n  > ${truncate(i.detail, 140)}` : "";
    return `- **${i.title}**${badge}${sub}${det}`;
  }).join("\n");
  const more = w.items.length > 30 ? `\n_… ${w.items.length - 30} more_` : "";
  return `${w.title ? `**${w.title}**\n\n` : ""}${lines}${more}`;
}

function renderTable(w: TableWidget): string {
  if (w.rows.length === 0) return w.title ? `**${w.title}**: (empty)` : "(empty)";
  const head = `| ${w.columns.join(" | ")} |\n| ${w.columns.map(() => "---").join(" | ")} |`;
  const body = w.rows.slice(0, 30).map(r =>
    `| ${w.columns.map(c => formatCell(r[c]).replace(/\|/g, "\\|")).join(" | ")} |`
  ).join("\n");
  const more = w.rows.length > 30 ? `\n_… ${w.rows.length - 30} more rows_` : "";
  return `${w.title ? `**${w.title}**\n\n` : ""}${head}\n${body}${more}`;
}

function renderMetric(w: MetricWidget): string {
  const arrow = w.trend === "up" ? "↑" : w.trend === "down" ? "↓" : "";
  return `**${w.label}**: ${w.value}${w.unit ? ` ${w.unit}` : ""}${w.trendValue ? ` (${arrow} ${w.trendValue})` : ""}`;
}

function renderMetricGrid(w: MetricGridWidget): string {
  return w.metrics.map(renderMetric).join(" · ");
}

function renderKeyValue(w: KeyValueWidget): string {
  const lines = w.pairs.map(({ key, value }) => `- **${key}**: ${value}`).join("\n");
  return `${w.title ? `**${w.title}**\n\n` : ""}${lines}`;
}

function renderStatus(w: StatusWidget): string {
  const icon = w.state === "ok" ? "✓" : w.state === "warn" ? "⚠️" : "✗";
  const det  = w.details?.length ? "\n" + w.details.map(d => `- **${d.key}**: ${d.value}`).join("\n") : "";
  return `${icon} **${w.message}**${det}`;
}

function renderDocument(w: DocumentWidget): string {
  return `${w.title ? `### ${w.title}\n\n` : ""}${w.byline ? `_${w.byline}_\n\n` : ""}${truncate(w.body, 600)}`;
}

function renderCalendar(w: CalendarWidget): string {
  if (w.events.length === 0) return w.title ? `**${w.title}**: no events` : "no events";
  const lines = w.events.slice(0, 20).map(e => {
    const time = e.allDay ? formatDate(e.startsAt) : formatDateTime(e.startsAt);
    const loc  = e.location ? ` · ${e.location}` : "";
    return `- **${time}** — ${e.title}${loc}`;
  }).join("\n");
  return `${w.title ? `**${w.title}**\n\n` : ""}${lines}`;
}

function renderPlan(w: PlanWidget): string {
  const mark = (s: PlanStep["status"]) => ({
    pending: "[ ]", in_progress: "[~]", completed: "[x]", failed: "[!]", skipped: "[-]",
  })[s];
  return `**${w.title}**\n\n` + w.steps.map(s => `- ${mark(s.status)} ${s.label}${s.detail ? ` — ${s.detail}` : ""}`).join("\n");
}

function renderEmpty(w: EmptyWidget): string {
  return w.message ?? "(empty)";
}

// helpers
type PlanStep = PlanWidget["steps"][number];

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return truncate(v, 80);
  if (typeof v === "object") return truncate(JSON.stringify(v), 80);
  return String(v);
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
