/**
 * renderA2UI(WidgetData) → A2UI v0.9 envelope messages.
 *
 * A2UI is Google's open spec for agent-driven UIs (https://a2ui.org).
 * scenecast's role: emit one source-of-truth WidgetData JSON, exported
 * as a sequence of envelope messages any A2UI v0.9 client can render —
 * Lit, React, Angular, Flutter, OpenClaw Canvas, ADK Web, …
 *
 * Minimal v0:
 *   - Full-snapshot only: createSurface + updateComponents.
 *   - No data-model / two-way binding (scenes carry typed state upstream).
 *   - Targets the v0.9 basic_catalog component vocabulary so any
 *     reference renderer with the basic catalog renders us out of the box:
 *     Text (variant: h1..h5,caption,body), Card (child: id), Column,
 *     Row, List (children: id[]), Divider.
 *
 * Envelope shape is the real v0.9 schema (validated in tests against
 * @a2ui/web_core/v0_9 Zod schemas):
 *
 *   { version: "v0.9", createSurface:    { surfaceId, catalogId, … } }
 *   { version: "v0.9", updateComponents: { surfaceId, components: [{component, id?, …}, …] } }
 *   { version: "v0.9", deleteSurface:    { surfaceId } }
 *
 * Spec: https://a2ui.org/specification/v0.9-a2ui/
 */

import type {
  WidgetData, IconWidget, StackWidget, ListWidget, TableWidget,
  MetricWidget, MetricGridWidget, KeyValueWidget, StatusWidget,
  DocumentWidget, CalendarWidget, PlanWidget, EmptyWidget,
  Model3DWidget,
} from "../widgets.js";

// ---------------------------------------------------------------------------
// Envelope types (server → client subset — what a renderer emits)
// ---------------------------------------------------------------------------

export type A2UIMessage =
  | A2UICreateSurface
  | A2UIUpdateComponents
  | A2UIDeleteSurface;

export interface A2UICreateSurface {
  version: "v0.9";
  createSurface: {
    surfaceId:     string;
    catalogId:     string;
    theme?:        unknown;
    sendDataModel?: boolean;
  };
}

export interface A2UIUpdateComponents {
  version: "v0.9";
  updateComponents: {
    surfaceId:  string;
    components: A2UIComponent[];
  };
}

export interface A2UIDeleteSurface {
  version: "v0.9";
  deleteSurface: { surfaceId: string };
}

/** Adjacency-list component: children referenced by id, one component is `root`. */
export interface A2UIComponent {
  component: string;
  id?:       string;
  weight?:   number;
  [prop:     string]: unknown;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const DEFAULT_SURFACE_ID = "scenecast";
/** The v0.9 basic catalog ID — must match what @a2ui/web_core ships at runtime. */
export const A2UI_BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/basic_catalog.json";

export interface RenderA2UIOpts {
  surfaceId?: string;
  /** Catalog ID. Defaults to the v0.9 basic_catalog. */
  catalogId?: string;
}

export function renderA2UI(w: WidgetData, opts: RenderA2UIOpts = {}): A2UIMessage[] {
  const surfaceId = opts.surfaceId ?? DEFAULT_SURFACE_ID;
  const catalogId = opts.catalogId ?? A2UI_BASIC_CATALOG_ID;
  const ctx: BuildCtx = { counter: 0, out: [] };
  build(w, ctx, "root");
  return [
    { version: "v0.9", createSurface:    { surfaceId, catalogId } },
    { version: "v0.9", updateComponents: { surfaceId, components: ctx.out } },
  ];
}

/** Convenience: encode as JSONL — A2UI's documented wire format. */
export function toA2UIJSONL(messages: A2UIMessage[]): string {
  return messages.map(m => JSON.stringify(m)).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

interface BuildCtx { counter: number; out: A2UIComponent[] }

function nextId(ctx: BuildCtx): string {
  return `c${++ctx.counter}`;
}

/** Emit a component with a fresh id; returns the id. */
function emit(ctx: BuildCtx, c: Omit<A2UIComponent, "id">, idOverride?: string): string {
  const id = idOverride ?? nextId(ctx);
  ctx.out.push({ id, ...c });
  return id;
}

/**
 * Build a widget into ctx.out, optionally forcing an id (used to emit `root`).
 * Returns the id of the produced component.
 */
function build(w: WidgetData, ctx: BuildCtx, idOverride?: string): string {
  switch (w.type) {
    case "icon":         return buildIcon(w, ctx, idOverride);
    case "stack":        return buildStack(w, ctx, idOverride);
    case "list":         return buildList(w, ctx, idOverride);
    case "table":        return buildTable(w, ctx, idOverride);
    case "metric":       return buildMetric(w, ctx, idOverride);
    case "metric_grid":  return buildMetricGrid(w, ctx, idOverride);
    case "key_value":    return buildKeyValue(w, ctx, idOverride);
    case "status":       return buildStatus(w, ctx, idOverride);
    case "document":     return buildDocument(w, ctx, idOverride);
    case "calendar":     return buildCalendar(w, ctx, idOverride);
    case "plan":         return buildPlan(w, ctx, idOverride);
    case "empty":        return buildEmpty(w, ctx, idOverride);
    case "model_3d":     return buildModel3D(w, ctx, idOverride);
  }
}

/** Card holds a single child, so for compound content we wrap in a Column. */
function cardWith(children: string[], ctx: BuildCtx, idOverride?: string): string {
  const inner = emit(ctx, { component: "Column", children });
  return emit(ctx, { component: "Card", child: inner }, idOverride);
}

function buildIcon(w: IconWidget, ctx: BuildCtx, idOverride?: string): string {
  const labelId = emit(ctx, { component: "Text", text: w.label, variant: "h3" });
  const ids = [labelId];
  if (w.badge !== undefined) {
    ids.push(emit(ctx, { component: "Text", text: String(w.badge), variant: "caption" }));
  }
  return cardWith(ids, ctx, idOverride);
}

function buildStack(w: StackWidget, ctx: BuildCtx, idOverride?: string): string {
  const children: string[] = [];
  if (w.header) {
    children.push(emit(ctx, { component: "Text", text: w.header.title, variant: "h2" }));
    if (w.header.meta) {
      children.push(emit(ctx, { component: "Text", text: w.header.meta, variant: "caption" }));
    }
  }
  for (const child of w.body) children.push(build(child, ctx));
  const layout = w.layout === "grid-2" ? "Row" : "Column";
  return emit(ctx, { component: layout, children }, idOverride);
}

function buildList(w: ListWidget, ctx: BuildCtx, idOverride?: string): string {
  const children: string[] = [];
  if (w.title) {
    children.push(emit(ctx, { component: "Text", text: w.title, variant: "h2" }));
  }
  if (w.items.length === 0) {
    children.push(emit(ctx, { component: "Text", text: w.empty ?? "(empty)" }));
  }
  for (const item of w.items) {
    const inner: string[] = [];
    inner.push(emit(ctx, { component: "Text", text: item.title, variant: "h4" }));
    if (item.subtitle) inner.push(emit(ctx, { component: "Text", text: item.subtitle, variant: "body" }));
    if (item.detail)   inner.push(emit(ctx, { component: "Text", text: item.detail, variant: "caption" }));
    if (item.badge)    inner.push(emit(ctx, { component: "Text", text: item.badge, variant: "caption" }));
    children.push(cardWith(inner, ctx));
  }
  return emit(ctx, { component: "List", children, direction: "vertical" }, idOverride);
}

function buildTable(w: TableWidget, ctx: BuildCtx, idOverride?: string): string {
  const children: string[] = [];
  if (w.title) {
    children.push(emit(ctx, { component: "Text", text: w.title, variant: "h2" }));
  }
  // Header row
  const headerCells = w.columns.map(c =>
    emit(ctx, { component: "Text", text: c, variant: "h5" })
  );
  children.push(emit(ctx, { component: "Row", children: headerCells }));
  children.push(emit(ctx, { component: "Divider" }));
  // Data rows
  for (const row of w.rows) {
    const cells = w.columns.map(c =>
      emit(ctx, { component: "Text", text: formatCell(row[c]), variant: "body" })
    );
    children.push(emit(ctx, { component: "Row", children: cells }));
  }
  return emit(ctx, { component: "Column", children }, idOverride);
}

function buildMetric(w: MetricWidget, ctx: BuildCtx, idOverride?: string): string {
  const valueText = `${w.value}${w.unit ? ` ${w.unit}` : ""}`;
  const inner: string[] = [
    emit(ctx, { component: "Text", text: w.label, variant: "caption" }),
    emit(ctx, { component: "Text", text: valueText, variant: "h1" }),
  ];
  if (w.trendValue) {
    const arrow = w.trend === "up" ? "↑" : w.trend === "down" ? "↓" : "";
    inner.push(emit(ctx, {
      component: "Text", text: `${arrow} ${w.trendValue}`.trim(), variant: "caption",
    }));
  }
  return cardWith(inner, ctx, idOverride);
}

function buildMetricGrid(w: MetricGridWidget, ctx: BuildCtx, idOverride?: string): string {
  const children = w.metrics.map(m => buildMetric(m, ctx));
  return emit(ctx, { component: "Row", children, justify: "spaceBetween" }, idOverride);
}

function buildKeyValue(w: KeyValueWidget, ctx: BuildCtx, idOverride?: string): string {
  const children: string[] = [];
  if (w.title) {
    children.push(emit(ctx, { component: "Text", text: w.title, variant: "h2" }));
  }
  for (const { key, value } of w.pairs) {
    const cells = [
      emit(ctx, { component: "Text", text: key,   variant: "h5" }),
      emit(ctx, { component: "Text", text: value, variant: "body" }),
    ];
    children.push(emit(ctx, { component: "Row", children: cells, justify: "spaceBetween" }));
  }
  return emit(ctx, { component: "Column", children }, idOverride);
}

function buildStatus(w: StatusWidget, ctx: BuildCtx, idOverride?: string): string {
  const icon = w.state === "ok" ? "✓" : w.state === "warn" ? "⚠" : "✗";
  const inner: string[] = [
    emit(ctx, { component: "Text", text: `${icon} ${w.message}`, variant: "h3" }),
  ];
  for (const d of w.details ?? []) {
    const cells = [
      emit(ctx, { component: "Text", text: d.key,   variant: "h5" }),
      emit(ctx, { component: "Text", text: d.value, variant: "body" }),
    ];
    inner.push(emit(ctx, { component: "Row", children: cells, justify: "spaceBetween" }));
  }
  return cardWith(inner, ctx, idOverride);
}

function buildDocument(w: DocumentWidget, ctx: BuildCtx, idOverride?: string): string {
  const inner: string[] = [];
  if (w.title)  inner.push(emit(ctx, { component: "Text", text: w.title,  variant: "h1" }));
  if (w.byline) inner.push(emit(ctx, { component: "Text", text: w.byline, variant: "caption" }));
  inner.push(emit(ctx, { component: "Text", text: w.body, variant: "body" }));
  return cardWith(inner, ctx, idOverride);
}

function buildCalendar(w: CalendarWidget, ctx: BuildCtx, idOverride?: string): string {
  const children: string[] = [];
  if (w.title) {
    children.push(emit(ctx, { component: "Text", text: w.title, variant: "h2" }));
  }
  for (const ev of w.events) {
    const inner: string[] = [
      emit(ctx, { component: "Text", text: ev.title,    variant: "h4" }),
      emit(ctx, { component: "Text", text: ev.startsAt, variant: "caption" }),
    ];
    if (ev.location) {
      inner.push(emit(ctx, { component: "Text", text: ev.location, variant: "caption" }));
    }
    children.push(cardWith(inner, ctx));
  }
  return emit(ctx, { component: "List", children, direction: "vertical" }, idOverride);
}

function buildPlan(w: PlanWidget, ctx: BuildCtx, idOverride?: string): string {
  const children = [
    emit(ctx, { component: "Text", text: w.title, variant: "h2" }),
  ];
  for (const step of w.steps) {
    const mark =
      step.status === "completed"   ? "[x]" :
      step.status === "in_progress" ? "[~]" :
      step.status === "failed"      ? "[!]" :
      step.status === "skipped"     ? "[-]" : "[ ]";
    const text = `${mark} ${step.label}${step.detail ? ` — ${step.detail}` : ""}`;
    children.push(emit(ctx, { component: "Text", text, variant: "body" }));
  }
  return emit(ctx, { component: "Column", children }, idOverride);
}

function buildEmpty(w: EmptyWidget, ctx: BuildCtx, idOverride?: string): string {
  return emit(ctx, {
    component: "Text", text: w.message ?? "(empty)", variant: "caption",
  }, idOverride);
}

function buildModel3D(w: Model3DWidget, ctx: BuildCtx, idOverride?: string): string {
  // A2UI basic catalog has no native 3D viewer. Render a Card with a poster
  // Image (if any) plus the format-tagged metadata. Clients that adopt a
  // future "Model3D" component in their catalog can branch on it; everyone
  // else still sees a meaningful preview.
  const name = w.name ?? "3D model";
  const inner: string[] = [];
  if (w.posterUri) {
    inner.push(emit(ctx, { component: "Image", url: w.posterUri, description: name, fit: "contain" }));
  }
  inner.push(emit(ctx, { component: "Text", text: name, variant: "h4" }));
  const noun = (w.format === "pdb" || w.format === "mmcif") ? "atoms" : "verts";
  const parts: string[] = [w.format.toUpperCase()];
  if (w.vertexCount != null) parts.push(`${w.vertexCount.toLocaleString()} ${noun}`);
  if (w.bounds) {
    const u = w.bounds.unit ?? "";
    const fmt = (n: number) => {
      const s = n.toFixed(n < 10 ? 2 : 1);
      return u ? `${s}${u}` : s;
    };
    parts.push(`${fmt(w.bounds.width)} × ${fmt(w.bounds.height)} × ${fmt(w.bounds.depth)}`);
  }
  inner.push(emit(ctx, { component: "Text", text: parts.join(" · "), variant: "caption" }));
  return cardWith(inner, ctx, idOverride);
}

function formatCell(v: unknown): string {
  if (v == null)              return "";
  if (typeof v === "string")  return v;
  if (typeof v === "object")  return JSON.stringify(v);
  return String(v);
}
