/**
 * Asset — typed shape + view bindings for a piece of agent scene-state.
 *
 *   const Gmail = defineAsset({
 *     type:        "gmail/account",
 *     schema:      gmailSchema,
 *     defaultView: GmailInboxView,
 *     views:       { thread: GmailThreadView, contacts: GmailContactsView },
 *     secretFields: ["access_token"],
 *     mockState:   () => ({ messages: [...], labels: [...], drafts: [] }),
 *   });
 *
 * Anyone using scene-otel + scene-state gets `Gmail` as a typed handle:
 *   scene.set(Gmail, world.gmail)            // schema-validated snapshot
 *   Gmail.defaultView.toMarkdown(world.gmail) // agent-readable summary
 *   Gmail.defaultView.toHTML(world.gmail)     // dashboard-ready visual
 */

import type { JSONSchema, ViewDef } from "./view.js";

export interface AssetDef<TState = unknown> {
  /** Stable type id, e.g. "gmail/account". */
  type: string;
  /** JSON Schema describing the asset's state. */
  schema: JSONSchema;
  /** Default view used by viewers when no specific view is requested. */
  defaultView: ViewDef<TState>;
  /** Optional named alternate views. */
  views?: Record<string, ViewDef<TState>>;
  /** Field paths that are secrets — never logged, always masked. */
  secretFields?: string[];
  /** Factory for realistic mock state — used by gallery + tests. */
  mockState?: () => TState;
  /** Optional human-readable description. */
  description?: string;
}

export function defineAsset<TState = unknown>(config: AssetDef<TState>): AssetDef<TState> {
  return {
    secretFields: [],
    views: {},
    ...config,
  };
}
