/**
 * View — render asset state in multiple media (HTML / Markdown / Text)
 * at multiple sizes (icon / small / medium / large / xlarge).
 *
 * Same definition produces:
 *   - HTML        for human-visual rendering (dashboards, scrubbers, iOS)
 *   - Markdown    for LLM-context injection (token-efficient summaries)
 *   - Text        for terminal output and text-only models
 *
 * Sizes match Apple WidgetKit and Daslab's `WidgetSize` enum:
 *   icon:   1×1   identity only (name + icon, no fetched data)
 *   small:  2×2   one headline metric / 2-line summary
 *   medium: 4×2   short table or 2-3 metric grid
 *   large:  4×4   full glanceable summary
 *   xlarge: 8×4   multi-section, wide tables (iPad / desktop)
 *
 * Token-budget guidance (Markdown render):
 *   icon:   ~5 tokens     small: ~30      medium: ~80
 *   large: ~250          xlarge: ~800+
 *
 * Authors implement what they want. Sizes not implemented fall back through
 * the ladder: icon→small→medium, large→medium, xlarge→large→medium.
 */

export type JSONSchema = Record<string, unknown>;

/** Five-tier size system — matches Apple WidgetKit + Daslab WidgetSize. */
export type ViewSize = "icon" | "small" | "medium" | "large" | "xlarge";

/** Alias for Daslab's existing vocabulary — same values. */
export type WidgetSize = ViewSize;

export interface ViewOpts {
  /** Render at this size; default "medium". */
  size?: ViewSize;
}

export interface ViewDef<TState = unknown> {
  /** Stable view name, e.g. "GmailInbox". */
  name: string;
  /** Optional human-readable description (helps LLM tool specs / UIs). */
  description?: string;
  /** Optional JSON Schema for the input state. */
  schema?: JSONSchema;
  /** Render to HTML at the requested size (default "medium"). */
  toHTML(state: TState, opts?: ViewOpts): string;
  /** Render to Markdown at the requested size (default "medium"). */
  toMarkdown(state: TState, opts?: ViewOpts): string;
  /** Render to plain text — for terminals + text-only models. */
  toText?(state: TState, opts?: ViewOpts): string;
}

// ---------------------------------------------------------------------------
// Sized builder — declarative authoring with auto-fallback
// ---------------------------------------------------------------------------

/** A renderer at a single size returns both formats inline. */
export interface SizedRender {
  html:     string;
  markdown: string;
  text?:    string;
}

export type SizedRenderer<TState> = (state: TState) => SizedRender;

/** Per-size renderer map — implement only the sizes you want. */
export type SizedMap<TState> = Partial<Record<ViewSize, SizedRenderer<TState>>>;

export interface ViewDefConfig<TState> {
  name: string;
  description?: string;
  schema?: JSONSchema;
  /** Per-size renderers (declarative). One of `sizes` or explicit toHTML/toMarkdown is required. */
  sizes?: SizedMap<TState>;
  /** Single-size renderer (escape hatch when you want full control). */
  toHTML?: (state: TState, opts?: ViewOpts) => string;
  toMarkdown?: (state: TState, opts?: ViewOpts) => string;
  toText?: (state: TState, opts?: ViewOpts) => string;
}

/**
 * Build a view. Two patterns are supported:
 *
 *   // 1. Sized builder — preferred for assets that vary across sizes
 *   defineView({
 *     name: "Inbox",
 *     sizes: {
 *       icon:   (s) => ({ html: "📧 5", markdown: "📧 5" }),
 *       small:  (s) => ({ html: "...",  markdown: "..." }),
 *       medium: (s) => ({ html: "...",  markdown: "..." }),
 *     },
 *   });
 *
 *   // 2. Explicit functions — full control, ignore sizes
 *   defineView({
 *     name: "Static",
 *     toHTML(s, opts) { ... },
 *     toMarkdown(s, opts) { ... },
 *   });
 *
 * Sizes not implemented fall back through the ladder.
 */
export function defineView<TState = unknown>(config: ViewDefConfig<TState>): ViewDef<TState> {
  const { sizes } = config;

  if (sizes) {
    const resolveSize = (size: ViewSize): SizedRenderer<TState> | undefined => {
      // Fallback ladder — try requested, then walk down to medium.
      const ladder: ViewSize[] = (() => {
        switch (size) {
          case "icon":   return ["icon", "small", "medium"];
          case "small":  return ["small", "medium"];
          case "medium": return ["medium"];
          case "large":  return ["large", "medium"];
          case "xlarge": return ["xlarge", "large", "medium"];
        }
      })();
      for (const s of ladder) {
        if (sizes[s]) return sizes[s];
      }
      // Last resort — pick any defined size.
      return Object.values(sizes).find(Boolean);
    };

    const toHTML = (state: TState, opts?: ViewOpts) => {
      const r = resolveSize(opts?.size ?? "medium");
      return r ? r(state).html : "";
    };
    const toMarkdown = (state: TState, opts?: ViewOpts) => {
      const r = resolveSize(opts?.size ?? "medium");
      return r ? r(state).markdown : "";
    };
    const toText = (state: TState, opts?: ViewOpts) => {
      const r = resolveSize(opts?.size ?? "medium");
      const out = r ? r(state) : { html: "", markdown: "" };
      return out.text ?? stripTags(out.html);
    };

    return {
      name:       config.name,
      description: config.description,
      schema:     config.schema,
      toHTML:     config.toHTML     ?? toHTML,
      toMarkdown: config.toMarkdown ?? toMarkdown,
      toText:     config.toText     ?? toText,
    };
  }

  // No sizes map — use explicit functions.
  if (!config.toHTML || !config.toMarkdown) {
    throw new Error(`defineView(${config.name}): provide either \`sizes\` or both \`toHTML\` and \`toMarkdown\``);
  }
  return {
    name:       config.name,
    description: config.description,
    schema:     config.schema,
    toHTML:     config.toHTML,
    toMarkdown: config.toMarkdown,
    toText:     config.toText ?? ((state, opts) => stripTags(config.toHTML!(state, opts))),
  };
}

// ---------------------------------------------------------------------------
// Helpers reused by built-in views
// ---------------------------------------------------------------------------

export function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c] as string);
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Pixel dimensions per size (matches Daslab's widgetSizeCols / widgetSizeRows). */
export function viewSizeGrid(size: ViewSize): { cols: number; rows: number } {
  switch (size) {
    case "icon":   return { cols: 1, rows: 1 };
    case "small":  return { cols: 2, rows: 2 };
    case "medium": return { cols: 4, rows: 2 };
    case "large":  return { cols: 4, rows: 4 };
    case "xlarge": return { cols: 8, rows: 4 };
  }
}
