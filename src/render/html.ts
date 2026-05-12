/**
 * renderHTML(WidgetData) → HTML string.
 *
 * One renderer that handles every WidgetData kind. View authors don't write
 * HTML — they return WidgetData, this renders it.
 */

import type {
  WidgetData, IconWidget, StackWidget, ListWidget, TableWidget,
  MetricWidget, MetricGridWidget, KeyValueWidget, StatusWidget,
  DocumentWidget, CalendarWidget, PlanWidget, EmptyWidget,
  Model3DWidget,
} from "../widgets.js";
import { escapeHtml, truncate } from "../view.js";

export function renderHTML(w: WidgetData): string {
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
    case "model_3d":    return renderModel3D(w);
  }
}

const COLOR_GRADIENTS: Record<string, { from: string; to: string; fg: string }> = {
  blue:   { from: "#0a84ff", to: "#0040dd", fg: "#fff" },
  green:  { from: "#34c759", to: "#1ca647", fg: "#fff" },
  purple: { from: "#af52de", to: "#7e3fb1", fg: "#fff" },
  red:    { from: "#ff3b30", to: "#d92520", fg: "#fff" },
  orange: { from: "#ff9500", to: "#e07700", fg: "#fff" },
  yellow: { from: "#ffcc00", to: "#e0a800", fg: "#3a2a00" },
  indigo: { from: "#5856d6", to: "#3f3eaf", fg: "#fff" },
  pink:   { from: "#ff2d92", to: "#d11270", fg: "#fff" },
  teal:   { from: "#32ade6", to: "#1a8fc7", fg: "#fff" },
  gray:   { from: "#8e8e93", to: "#636366", fg: "#fff" },
};

function colorStyle(color: string): string {
  const c = COLOR_GRADIENTS[color] ?? COLOR_GRADIENTS.gray!;
  return `background:linear-gradient(160deg,${c.from} 0%,${c.to} 100%);color:${c.fg}`;
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderIcon(w: IconWidget): string {
  const badge = w.badge != null && w.badge !== 0 && w.badge !== ""
    ? `<div class="ws-app-badge">${escapeHtml(w.badge)}</div>` : "";
  return `<div class="ws-app-icon">
    <div class="ws-app-tile" style="${colorStyle(w.color)}">
      <div class="ws-app-glyph">${w.glyph}</div>
      ${badge}
    </div>
    <div class="ws-app-name">${escapeHtml(w.label)}</div>
  </div>`;
}

/** Inline icon chip — small variant for headers. */
function iconChip(glyph: string, color: string): string {
  return `<div class="ws-app-tile ws-app-tile--chip" style="${colorStyle(color)}">
    <div class="ws-app-glyph">${glyph}</div>
  </div>`;
}

function renderStack(w: StackWidget): string {
  const head = w.header ? `
    <div class="ws-stack-head">
      ${w.header.glyph && w.header.color ? iconChip(w.header.glyph, w.header.color) : ""}
      <span class="ws-stack-title">${escapeHtml(w.header.title)}</span>
      ${w.header.meta ? `<span class="ws-stack-meta">${escapeHtml(w.header.meta)}</span>` : ""}
    </div>` : "";
  const body = w.body.map(renderHTML).join("");
  const layoutClass = w.layout === "grid-2" ? "ws-stack--grid-2" : "ws-stack--vertical";
  return `<div class="ws-stack ${layoutClass}">${head}<div class="ws-stack-body">${body}</div></div>`;
}

function renderList(w: ListWidget): string {
  if (w.items.length === 0) return `<div class="ws-empty">${escapeHtml(w.empty ?? "—")}</div>`;
  const layoutCls = w.layout === "grid-2" ? "ws-list--grid-2" : "ws-list--vertical";
  const items = w.items.slice(0, 30).map((i, idx) => {
    const anchor = anchorAttr(i.id != null ? `item[${i.id}]` : `row[${idx}]`);
    return `<li class="ws-li"${anchor}>
      <div class="ws-li-row">
        <span class="ws-li-title">${escapeHtml(i.title)}</span>
        ${i.badge ? `<span class="ws-badge">${escapeHtml(i.badge)}</span>` : ""}
      </div>
      ${i.subtitle ? `<div class="ws-li-sub">${escapeHtml(i.subtitle)}</div>` : ""}
      ${i.detail ? `<div class="ws-li-detail">${escapeHtml(i.detail)}</div>` : ""}
    </li>`;
  }).join("");
  const more = w.items.length > 30 ? `<li class="ws-more">… ${w.items.length - 30} more</li>` : "";
  return `<div class="ws-list ${layoutCls}">${w.title ? `<div class="ws-title">${escapeHtml(w.title)}</div>` : ""}<ul>${items}${more}</ul></div>`;
}

function renderTable(w: TableWidget): string {
  if (w.rows.length === 0) return `<div class="ws-empty">empty table</div>`;
  const head = w.columns.map(c => `<th>${escapeHtml(c)}</th>`).join("");
  const body = w.rows.slice(0, 50).map((r, idx) =>
    `<tr${anchorAttr(`row[${idx}]`)}>${w.columns.map(c => `<td>${escapeHtml(formatCell(r[c]))}</td>`).join("")}</tr>`
  ).join("");
  const more = w.rows.length > 50 ? `<tr><td colspan="${w.columns.length}" class="ws-more">… ${w.rows.length - 50} more rows</td></tr>` : "";
  return `<div class="ws-table">${w.title ? `<div class="ws-title">${escapeHtml(w.title)}</div>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${body}${more}</tbody></table></div>`;
}

function renderMetric(w: MetricWidget): string {
  const arrow = w.trend === "up" ? "▲" : w.trend === "down" ? "▼" : w.trend === "flat" ? "→" : "";
  const trendCls = w.trend === "up" ? "ws-up" : w.trend === "down" ? "ws-down" : "ws-flat";
  // When this metric is a sub-element of a metric_grid, the grid wrapper sets
  // the anchor; standalone metrics carry their own if they have an id.
  const anchor = w.id ? anchorAttr(`metric[${w.id}]`) : "";
  return `<div class="ws-metric"${anchor}>
    <div class="ws-metric-value">${escapeHtml(w.value)}${w.unit ? `<span class="ws-unit">${escapeHtml(w.unit)}</span>` : ""}</div>
    <div class="ws-metric-label">${escapeHtml(w.label)}</div>
    ${w.trendValue ? `<div class="ws-delta ${trendCls}">${arrow} ${escapeHtml(w.trendValue)}</div>` : ""}
  </div>`;
}

function renderMetricGrid(w: MetricGridWidget): string {
  const cls = w.metrics.length >= 3 ? "ws-grid-3" : "ws-grid-2";
  return `<div class="${cls}">${w.metrics.map(renderMetric).join("")}</div>`;
}

function renderKeyValue(w: KeyValueWidget): string {
  const rows = w.pairs.map(({ key, value }) =>
    `<div class="ws-kv-row"${anchorAttr(`field[${key}]`)}><span class="ws-kv-key">${escapeHtml(key)}</span><span class="ws-kv-val">${escapeHtml(value)}</span></div>`
  ).join("");
  return `<div class="ws-kv">${w.title ? `<div class="ws-title">${escapeHtml(w.title)}</div>` : ""}${rows}</div>`;
}

function renderStatus(w: StatusWidget): string {
  const cls  = w.state === "ok" ? "ws-status-ok" : w.state === "warn" ? "ws-status-warn" : "ws-status-fail";
  const icon = w.state === "ok" ? "✓" : w.state === "warn" ? "!" : "✗";
  const det  = w.details?.length
    ? `<div class="ws-status-details">${w.details.map(d => `<div${anchorAttr(`field[${d.key}]`)}><span class="ws-kv-key">${escapeHtml(d.key)}</span><span>${escapeHtml(d.value)}</span></div>`).join("")}</div>`
    : "";
  return `<div class="ws-status ${cls}"><div class="ws-status-icon">${icon}</div><div class="ws-status-msg">${escapeHtml(w.message)}</div>${det}</div>`;
}

function renderDocument(w: DocumentWidget): string {
  const words = w.body.split(/\s+/).filter(Boolean).length;
  return `<div class="ws-doc">
    ${w.title ? `<div class="ws-doc-title">${escapeHtml(w.title)}</div>` : ""}
    ${w.byline ? `<div class="ws-doc-byline">${escapeHtml(w.byline)}</div>` : ""}
    ${w.meta ? `<div class="ws-doc-meta">${escapeHtml(w.meta)}</div>` : ""}
    <div class="ws-doc-body">${escapeHtml(w.body)}</div>
    <div class="ws-doc-stats">${words} words · ~${Math.max(1, Math.round(words / 200))} min</div>
  </div>`;
}

function renderCalendar(w: CalendarWidget): string {
  if (w.events.length === 0) return `<div class="ws-empty">no events</div>`;
  const rows = w.events.slice(0, 20).map((e, idx) => {
    const anchor = anchorAttr(e.id != null ? `item[${e.id}]` : `row[${idx}]`);
    return `<div class="ws-cal-row"${anchor}>
      <div class="ws-cal-time">${escapeHtml(formatDateRange(e.startsAt, e.endsAt, e.allDay))}</div>
      <div class="ws-cal-body">
        <div class="ws-cal-title">${escapeHtml(e.title)}</div>
        ${e.location ? `<div class="ws-cal-loc">📍 ${escapeHtml(e.location)}</div>` : ""}
        ${e.attendees?.length ? `<div class="ws-cal-att">${escapeHtml(e.attendees.slice(0,3).join(", "))}${e.attendees.length > 3 ? ` +${e.attendees.length - 3}` : ""}</div>` : ""}
      </div>
    </div>`;
  }).join("");
  return `<div class="ws-cal">${w.title ? `<div class="ws-title">${escapeHtml(w.title)}</div>` : ""}${rows}</div>`;
}

function renderPlan(w: PlanWidget): string {
  const mark = (s: PlanStep["status"]) => ({
    pending: "○", in_progress: "◐", completed: "●", failed: "✗", skipped: "⊘",
  })[s];
  return `<div class="ws-plan"><div class="ws-title">${escapeHtml(w.title)}</div>${w.steps.map((s, idx) => {
    const anchor = anchorAttr(s.id != null ? `step[${s.id}]` : `row[${idx}]`);
    return `<div class="ws-plan-row ws-plan-${s.status}"${anchor}>
      <span class="ws-plan-mark">${mark(s.status)}</span>
      <div>
        <div class="ws-plan-label">${escapeHtml(s.label)}</div>
        ${s.detail ? `<div class="ws-plan-detail">${escapeHtml(s.detail)}</div>` : ""}
      </div>
    </div>`;
  }).join("")}</div>`;
}

function renderEmpty(w: EmptyWidget): string {
  return `<div class="ws-empty">${escapeHtml(w.message ?? "—")}</div>`;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Emit a `data-widget-anchor="<selector>"` attribute when the selector
 *  is non-empty. Consuming runtimes read this to bind annotations,
 *  selections, and agent tool targets to specific sub-elements. */
function anchorAttr(selector: string | null | undefined): string {
  if (!selector) return "";
  return ` data-widget-anchor="${escapeHtml(selector)}"`;
}

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

// ---------------------------------------------------------------------------
// Model3D — 3D file viewer (glb/gltf/usdz via <model-viewer>; metadata card
// fallback for formats without an embedded viewer yet).
//
// Loading: consumers must include the model-viewer script ONCE per page —
//   <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
// Browsers dedupe same-URL ES module imports, so multiple inclusions are safe.
// ---------------------------------------------------------------------------

const MODEL_VIEWER_FORMATS = new Set(["glb", "gltf", "usdz"]);

function renderModel3D(w: Model3DWidget): string {
  const name = w.name ?? formatLabel(w.format);
  const summary = formatSummary(w);
  if (MODEL_VIEWER_FORMATS.has(w.format)) {
    const attrs = [
      `src="${escapeHtml(w.uri)}"`,
      `alt="${escapeHtml(name)}"`,
      `loading="lazy"`,
      `reveal="auto"`,
      "camera-controls",
      "touch-action=\"pan-y\"",
      w.autoRotate !== false ? "auto-rotate" : "",
      w.posterUri  ? `poster="${escapeHtml(w.posterUri)}"` : "",
      w.cameraOrbit ? `camera-orbit="${escapeHtml(w.cameraOrbit)}"` : "",
    ].filter(Boolean).join(" ");
    return `<div class="ws-model3d">
      <model-viewer ${attrs} style="width:100%;height:100%;min-height:240px;background:#f1f5f9;border-radius:8px"></model-viewer>
      <div class="ws-model3d-meta">${escapeHtml(summary)}</div>
    </div>`;
  }
  // Fallback: format-tagged metadata card. (PDB, URDF, STL, … will get their
  // own renderers later — Mol*, urdf-loader, three-stl-loader.)
  return `<div class="ws-model3d ws-model3d-fallback">
    <div class="ws-model3d-poster">
      ${w.posterUri ? `<img src="${escapeHtml(w.posterUri)}" alt="${escapeHtml(name)}">` : `<span class="ws-model3d-format">${escapeHtml(w.format.toUpperCase())}</span>`}
    </div>
    <div class="ws-model3d-info">
      <div class="ws-model3d-name">${escapeHtml(name)}</div>
      <div class="ws-model3d-meta">${escapeHtml(summary)}</div>
      <a class="ws-model3d-link" href="${escapeHtml(w.uri)}" target="_blank" rel="noreferrer noopener">Open ${escapeHtml(w.format.toUpperCase())} →</a>
    </div>
  </div>`;
}

function formatLabel(f: Model3DWidget["format"]): string {
  return ({
    glb: "glTF binary", gltf: "glTF", usd: "USD", usdz: "USDZ",
    stl: "STL", obj: "OBJ", ply: "PLY",
    urdf: "URDF", mjcf: "MuJoCo XML",
    pdb: "Protein Data Bank", mmcif: "mmCIF", sdf: "SDF",
    step: "STEP",
  } as Record<string, string>)[f] ?? f.toUpperCase();
}

function formatSummary(w: Model3DWidget): string {
  const parts: string[] = [w.format.toUpperCase()];
  if (w.vertexCount != null) {
    parts.push(`${w.vertexCount.toLocaleString()} ${w.format === "pdb" || w.format === "mmcif" ? "atoms" : "verts"}`);
  }
  if (w.bounds) {
    const u = w.bounds.unit ?? "";
    const fmt = (n: number) => {
      const s = n.toFixed(n < 10 ? 2 : 1);
      return u ? `${s}${u}` : s;
    };
    parts.push(`${fmt(w.bounds.width)} × ${fmt(w.bounds.height)} × ${fmt(w.bounds.depth)}`);
  }
  return parts.join(" · ");
}
