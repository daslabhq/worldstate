/**
 * scene-state — typed asset shapes + visual + headless views for AI agents.
 *
 * Same view definition produces:
 *   - HTML        for human-visual rendering
 *   - Markdown    for LLM context (token-efficient summaries)
 *   - Text        for terminal output and text-only models
 *
 * Two layers of types:
 *   - Canonical types (Email, Message, Contact, …)  — abstract primitives
 *   - Vendor implementations (Gmail, Slack, …)      — declare extends:
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

// Built-in primitives
export * as primitives from "./views/primitives.js";

// Canonical types — abstract primitives
export * from "./types/index.js";
export { canonicalTypes } from "./types/index.js";

// Vendor implementations — extend canonical types
export { Gmail }          from "./vendors/gmail.js";
export { Salesforce }     from "./vendors/salesforce.js";
export { Slack }          from "./vendors/slack.js";
export { GoogleSheets }   from "./vendors/google_sheets.js";
export { GoogleCalendar } from "./vendors/google_calendar.js";
export { Airtable }       from "./vendors/airtable.js";
export { Jira }           from "./vendors/jira.js";
export { Notion }         from "./vendors/notion.js";
export { Stripe }         from "./vendors/stripe.js";
export { GitHub }         from "./vendors/github.js";

import { Gmail }          from "./vendors/gmail.js";
import { Salesforce }     from "./vendors/salesforce.js";
import { Slack }          from "./vendors/slack.js";
import { GoogleSheets }   from "./vendors/google_sheets.js";
import { GoogleCalendar } from "./vendors/google_calendar.js";
import { Airtable }       from "./vendors/airtable.js";
import { Jira }           from "./vendors/jira.js";
import { Notion }         from "./vendors/notion.js";
import { Stripe }         from "./vendors/stripe.js";
import { GitHub }         from "./vendors/github.js";

export const vendors = {
  Gmail, Salesforce, Slack,
  GoogleSheets, GoogleCalendar, Airtable,
  Jira, Notion, Stripe, GitHub,
} as const;

/** @deprecated use `vendors` (kept for v0.1.x backward compat). */
export const assets = vendors;
