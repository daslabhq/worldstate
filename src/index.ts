/**
 * scenecast — typed canonical asset shapes + multi-format views for AI agents.
 *
 * Authors return WidgetData JSON per size; the framework converts to:
 *   - JSON       (the canonical primitive — same shape Daslab iOS uses)
 *   - HTML       for human-visual rendering (dashboards, scrubbers, web)
 *   - Markdown   for LLM context (token-efficient summaries)
 *   - Text       for terminal output and text-only models
 *   - A2UI       for portable agent-driven UI clients (https://a2ui.org)
 *   - MCP Apps   for iframe-based hosts: Claude / ChatGPT / VS Code / Goose / Cursor
 *
 * scenecast core ships only canonical types — Email, Message, Contact,
 * Event, Task, Document. Vendor implementations (Gmail, Slack, Salesforce, …)
 * are shipped by benchmark-scoped repos like scenebench as scenecast
 * extensions for their domain — they live with the benchmarks they came from.
 *
 * Pairs with scene-otel for emission. Daslab platform builds on it.
 */

// Core
export {
  defineView,
  escapeHtml,
  stripTags,
  truncate,
  viewSizeGrid,
  type ViewDef,
  type ViewDefConfig,
  type ViewOpts,
  type ViewSize,
  type WidgetSize,
  type SizedMap,
  type SizedRender,
  type SizedRenderer,
  type JSONSchema,
} from "./view.js";

export {
  defineAsset,
  type AssetDef,
} from "./asset.js";

// WidgetData — the canonical JSON shape view authors return
export type {
  WidgetData,
  WidgetColor,
  IconWidget, StackWidget, ListWidget, TableWidget,
  MetricWidget, MetricGridWidget, KeyValueWidget,
  StatusWidget, DocumentWidget, CalendarWidget,
  PlanWidget, EmptyWidget,
  Model3DWidget, Model3DFormat, Model3DBounds,
  ListItem, CalendarEventEntry, PlanStep,
  WidgetRenderer, WidgetSizes,
} from "./widgets.js";

// Renderers — convert WidgetData to HTML / Markdown / Text / A2UI / MCP Apps
export * as render from "./render/index.js";

// Addressability — anchor grammar for sub-elements (selections, annotations,
// agent tool targets, deep links). The asset is the atom; addressing has to
// live on the atom.
export {
  type AnchorSelector, type AnchorRef,
  formatAnchor, parseAnchor, anchor, anchorRef,
} from "./anchors.js";

// Legacy primitives — the pre-WidgetData view library, kept for back-compat
export * as primitives from "./views/primitives.js";

// Canonical types — abstract primitives
export * from "./types/index.js";
export { canonicalTypes } from "./types/index.js";
