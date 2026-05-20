/**
 * Anchor grammar — addressable points inside a WidgetData.
 *
 * Why this exists: typed state is the world model; rendering is a decoder
 * choice. Selections, annotations, agent tool targets, deep links, traces —
 * all need to *address* sub-elements of a widget (a specific list row, a
 * calendar event, a 3D object placed in a spatial scene). Without a shared
 * addressing convention, every consumer reinvents one slightly differently.
 *
 * scenecast owns the *contract* — the asset is the atom; addressability has
 * to live on the atom. Annotation taxonomies (selection / arrow / comment /
 * highlight / link), visual overlays, and runtime geometry resolution live
 * one layer up, in the consumer's UI runtime — not here. This file is *just*
 * the addressability primitive.
 *
 * String form:
 *   "widget"             → whole asset
 *   "item[m1]"           → list / calendar / generic sub-element
 *   "row[3]" | "row[id]" → table row
 *   "field[email]"       → keyed field
 *   "step[s1]"           → plan step
 *   "metric[uptime]"     → metric inside a metric_grid
 *   "zone[wet]"          → floorplan zone
 *   "object[flex-1]"     → spatial scene placed item
 *   "surface[wall-1]"    → 3D mesh face / glTF node
 *   "point[1.2,0.5]"     → 2D point
 *   "point[1.2,0.5,2.3]" → 3D point
 */

// ---------------------------------------------------------------------------
// Discriminated union — what an anchor can address
// ---------------------------------------------------------------------------

export type AnchorSelector =
  | { kind: "widget" }
  | { kind: "item";     id: string }
  | { kind: "row";      id?: string; index?: number }
  | { kind: "field";    key: string }
  | { kind: "step";     id: string }
  | { kind: "metric";   id: string }
  | { kind: "zone";     name: string }
  | { kind: "object";   id: string }
  | { kind: "surface";  id: string }
  | { kind: "point";    x: number; y: number; z?: number };

/** Asset-scoped reference — `{ asset_id, anchor?, name? }` is the wire shape
 *  consumers persist.
 *
 *  - `anchor` is a string-encoded AnchorSelector; omit or leave empty to
 *    address the whole asset.
 *  - `name` is an optional user-facing label, orthogonal to `anchor`. Pickers
 *    typically auto-assign positional labels (`"A"`, `"B"`, `"C"`, ...) at
 *    selection time and let users edit them. Surviving labels are how prompts
 *    refer to a specific selection — "compare anchor A to anchor B" reads the
 *    same regardless of whether the underlying asset exposes stable ids or
 *    only positional indices. Persistence is the caller's responsibility;
 *    nothing in the anchor grammar depends on `name`. */
export interface AnchorRef {
  asset_id: string;
  anchor?:  string;
  name?:    string;
}

// ---------------------------------------------------------------------------
// Format — selector → string
// ---------------------------------------------------------------------------

export function formatAnchor(s: AnchorSelector): string {
  switch (s.kind) {
    case "widget":  return "widget";
    case "item":    return `item[${s.id}]`;
    case "row":
      if (s.id != null)    return `row[${s.id}]`;
      if (s.index != null) return `row[${s.index}]`;
      return "row";
    case "field":   return `field[${s.key}]`;
    case "step":    return `step[${s.id}]`;
    case "metric":  return `metric[${s.id}]`;
    case "zone":    return `zone[${s.name}]`;
    case "object":  return `object[${s.id}]`;
    case "surface": return `surface[${s.id}]`;
    case "point":
      return s.z != null
        ? `point[${s.x},${s.y},${s.z}]`
        : `point[${s.x},${s.y}]`;
  }
}

// ---------------------------------------------------------------------------
// Parse — string → selector. Permissive: unrecognized strings throw.
// ---------------------------------------------------------------------------

const BRACKETED = /^([a-z_]+)\[(.+)\]$/i;

export function parseAnchor(s: string): AnchorSelector {
  const trimmed = s.trim();
  if (trimmed === "" || trimmed === "widget") return { kind: "widget" };

  const m = BRACKETED.exec(trimmed);
  if (!m) throw new Error(`anchor: unrecognized selector "${s}"`);
  const kind = m[1]!.toLowerCase();
  const arg  = m[2]!;

  switch (kind) {
    case "item":    return { kind: "item",   id: arg };
    case "step":    return { kind: "step",   id: arg };
    case "metric":  return { kind: "metric", id: arg };
    case "object":  return { kind: "object", id: arg };
    case "surface": return { kind: "surface", id: arg };
    case "zone":    return { kind: "zone",   name: arg };
    case "field":   return { kind: "field",  key: arg };
    case "row": {
      // row[<int>]  → positional; row[<anything-else>] → id
      if (/^-?\d+$/.test(arg)) return { kind: "row", index: parseInt(arg, 10) };
      return { kind: "row", id: arg };
    }
    case "point": {
      const parts = arg.split(",").map(p => p.trim());
      if (parts.length !== 2 && parts.length !== 3) {
        throw new Error(`anchor: point expects 2 or 3 coordinates, got "${s}"`);
      }
      const nums = parts.map(p => {
        const n = Number(p);
        if (!Number.isFinite(n)) throw new Error(`anchor: bad point coordinate "${p}"`);
        return n;
      });
      return parts.length === 3
        ? { kind: "point", x: nums[0]!, y: nums[1]!, z: nums[2]! }
        : { kind: "point", x: nums[0]!, y: nums[1]! };
    }
    default:
      throw new Error(`anchor: unknown kind "${kind}" in "${s}"`);
  }
}

// ---------------------------------------------------------------------------
// Convenience builders — terse and typed, useful in renderers
// ---------------------------------------------------------------------------

export const anchor = {
  widget:  (): AnchorSelector                    => ({ kind: "widget" }),
  item:    (id: string): AnchorSelector          => ({ kind: "item",    id }),
  row:     (idOrIndex: string | number): AnchorSelector =>
    typeof idOrIndex === "number"
      ? { kind: "row", index: idOrIndex }
      : { kind: "row", id: idOrIndex },
  field:   (key: string): AnchorSelector         => ({ kind: "field",   key }),
  step:    (id: string): AnchorSelector          => ({ kind: "step",    id }),
  metric:  (id: string): AnchorSelector          => ({ kind: "metric",  id }),
  zone:    (name: string): AnchorSelector        => ({ kind: "zone",    name }),
  object:  (id: string): AnchorSelector          => ({ kind: "object",  id }),
  surface: (id: string): AnchorSelector          => ({ kind: "surface", id }),
  point:   (x: number, y: number, z?: number): AnchorSelector =>
    z != null ? { kind: "point", x, y, z } : { kind: "point", x, y },
};

/** Compose an asset-scoped reference. Pass `name` for a user-facing label. */
export function anchorRef(assetId: string, sel?: AnchorSelector, name?: string): AnchorRef {
  const ref: AnchorRef = { asset_id: assetId };
  if (sel && sel.kind !== "widget") ref.anchor = formatAnchor(sel);
  if (name) ref.name = name;
  return ref;
}

/** Default positional label for the n-th selection: A, B, C, ..., Z, AA, AB, ... */
export function defaultAnchorName(index: number): string {
  if (index < 0) throw new Error(`defaultAnchorName: negative index ${index}`);
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
