/**
 * WidgetData — the canonical JSON shape that view authors return.
 *
 * Mirrors Daslab's `server/web/src/components/widgets/types.ts` so the
 * iOS app, the web client, and the scene-views gallery all render from
 * the same primitive. Authors return WidgetData per size; renderers
 * handle every output format (HTML / Markdown / Text / future SwiftUI /
 * Rerun / USD).
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
  | EmptyWidget;

/** A view that returns size-specific WidgetData per render. */
export type WidgetRenderer<TState> = (state: TState) => WidgetData;
export type WidgetSizes<TState> = Partial<Record<ViewSize, WidgetRenderer<TState>>>;
