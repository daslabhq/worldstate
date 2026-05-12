/**
 * WidgetData — the canonical JSON shape that view authors return.
 *
 * One primitive, many renderers. Authors return WidgetData per size;
 * renderers handle every output format (HTML, Markdown, Text, A2UI,
 * MCP Apps, native SwiftUI, future USD).
 *
 * The union is intentionally small but expressive enough to cover the
 * canonical types + vendor implementations. New widget kinds can be
 * added when a real use case demands; resist the temptation to model
 * every UI fragment as its own kind.
 */

import type { ViewSize } from "./view.js";

// ---------------------------------------------------------------------------
// Identity / chrome
// ---------------------------------------------------------------------------

export type WidgetColor =
  | "blue" | "green" | "purple" | "red"
  | "orange" | "yellow" | "indigo" | "pink"
  | "teal" | "gray";

/** App-icon style identity tile — used at size="icon" by default. */
export interface IconWidget {
  type:   "icon";
  glyph:  string;             // SVG markup (Heroicons, etc.)
  color:  WidgetColor;
  label:  string;
  badge?: number | string;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** Stacked composition — header + body widgets, useful for systemSmall/Medium. */
export interface StackWidget {
  type:   "stack";
  header?: { glyph?: string; color?: WidgetColor; title: string; meta?: string };
  body:   WidgetData[];
  /** Layout hint: "vertical" stacks; "grid-2" places body items in a 2-col grid. */
  layout?: "vertical" | "grid-2";
}

// ---------------------------------------------------------------------------
// Content widgets
// ---------------------------------------------------------------------------

export interface ListItem {
  /** Stable identity. When present, renderers emit `data-widget-anchor="item[<id>]"`
   *  so downstream annotation / selection layers can address the row across
   *  reorder / refilter. Falls back to positional addressing when omitted. */
  id?:      string;
  title:    string;
  subtitle?: string;
  detail?:  string;
  badge?:   string;
}

export interface ListWidget {
  type:   "list";
  title?: string;
  items:  ListItem[];
  totalItems?: number;
  empty?: string;
  /** "vertical" (default) stacks rows. "grid-2" lays items in a 2-col grid (good for systemMedium). */
  layout?: "vertical" | "grid-2";
}

export interface TableWidget {
  type:    "table";
  title?:  string;
  columns: string[];
  rows:    Array<Record<string, string | number>>;
  totalRows?: number;
}

export interface MetricWidget {
  type:        "metric";
  /** Stable identity for anchor addressing inside a metric_grid. */
  id?:         string;
  value:       string | number;
  label:       string;
  unit?:       string;
  trend?:      "up" | "down" | "flat";
  trendValue?: string;
}

export interface MetricGridWidget {
  type:    "metric_grid";
  metrics: MetricWidget[];
}

export interface KeyValueWidget {
  type:   "key_value";
  title?: string;
  pairs:  Array<{ key: string; value: string }>;
}

export interface StatusWidget {
  type:    "status";
  state:   "ok" | "warn" | "fail";
  message: string;
  details?: Array<{ key: string; value: string }>;
}

export interface DocumentWidget {
  type:    "document";
  title?:  string;
  body:    string;
  byline?: string;
  meta?:   string;
}

export interface CalendarEventEntry {
  /** Stable identity. Anchor selector: `item[<id>]`. */
  id?:       string;
  title:     string;
  startsAt:  string;
  endsAt?:   string;
  location?: string;
  attendees?: string[];
  allDay?:   boolean;
}

export interface CalendarWidget {
  type:   "calendar";
  title?: string;
  events: CalendarEventEntry[];
}

export interface PlanStep {
  /** Stable identity. Anchor selector: `step[<id>]` (or `item[<id>]`). */
  id?:     string;
  label:   string;
  status:  "pending" | "in_progress" | "completed" | "failed" | "skipped";
  detail?: string;
}

export interface PlanWidget {
  type:   "plan";
  title:  string;
  steps:  PlanStep[];
}

export interface EmptyWidget {
  type:    "empty";
  message?: string;
}

// ---------------------------------------------------------------------------
// 3D / spatial — single primitive that points at a 3D file in any format.
// Renderers discriminate on `format` and pick a viewer (model-viewer for
// glb/gltf/usdz, mol*-style for pdb, urdf-loader for urdf, …). For formats
// without a renderer yet, the HTML target falls back to a metadata card.
// ---------------------------------------------------------------------------

export type Model3DFormat =
  | "glb" | "gltf" | "usd" | "usdz"
  | "stl" | "obj" | "ply"
  | "urdf" | "mjcf"
  | "pdb" | "mmcif" | "sdf"
  | "step";

export interface Model3DBounds {
  /** Approximate axis-aligned dimensions, in any unit (renderers display as-is). */
  width:  number;
  height: number;
  depth:  number;
  /** Optional unit hint shown in summaries: "cm", "mm", "m", "Å", "px". */
  unit?:  string;
}

export interface Model3DWidget {
  type:        "model_3d";
  /** URL to the 3D file. data:, https:, or blob:. */
  uri:         string;
  /** Format hint — drives the viewer choice in HTML / A2UI / MCP Apps. */
  format:      Model3DFormat;
  /** Display name (used as accessibility alt and in summaries). */
  name?:       string;
  /** Approximate bounds for the markdown summary. */
  bounds?:     Model3DBounds;
  /** Vertex / atom / triangle count, whatever the format calls it. */
  vertexCount?: number;
  /** Image URL shown before the model loads (model-viewer poster). */
  posterUri?:  string;
  /** model-viewer camera-orbit hint, e.g. "0deg 75deg 105%". */
  cameraOrbit?: string;
  /** Auto-rotate the camera when idle. */
  autoRotate?: boolean;
}

// ---------------------------------------------------------------------------
// Union
// ---------------------------------------------------------------------------

export type WidgetData =
  | IconWidget
  | StackWidget
  | ListWidget
  | TableWidget
  | MetricWidget
  | MetricGridWidget
  | KeyValueWidget
  | StatusWidget
  | DocumentWidget
  | CalendarWidget
  | PlanWidget
  | EmptyWidget
  | Model3DWidget;

/** A view that returns size-specific WidgetData per render. */
export type WidgetRenderer<TState> = (state: TState) => WidgetData;
export type WidgetSizes<TState> = Partial<Record<ViewSize, WidgetRenderer<TState>>>;
