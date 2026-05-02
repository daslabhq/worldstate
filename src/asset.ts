/**
 * Asset — typed shape + view bindings for a piece of agent scene-state.
 *
 * Canonical types (Email, Message, Contact, …) live in `scene-state/types/`.
 * Vendor implementations (Gmail, Slack, …) live in `scene-state/vendors/` and
 * declare `extends: ["email/mailbox"]` to identify the canonical type they
 * implement.
 *
 *   const Gmail = defineAsset({
 *     type:        "gmail/account",
 *     extends:     ["email/mailbox"],         // declares canonical type
 *     schema:      gmailSchema,
 *     defaultView: GmailInboxView,
 *     views:       { thread: GmailThreadView },
 *     secretFields: ["access_token"],
 *     mockState:   () => ({ messages: [...], labels: [...], drafts: [] }),
 *   });
 *
 * Tools that consume canonical types (e.g. an "Email" renderer) can work
 * uniformly against any vendor that extends the canonical — Gmail, Outlook,
 * ProtonMail, etc.
 */

import type { JSONSchema, ViewDef } from "./view.js";

export interface AssetDef<TState = unknown> {
  /** Stable type id, e.g. "gmail/account" or "email/mailbox". */
  type: string;
  /** Canonical types this asset extends — e.g. ["email/mailbox"]. Optional. */
  extends?: string[];
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
    extends: [],
    ...config,
  };
}
