/**
 * scene-state — typed asset shapes + visual + headless views for AI agents.
 *
 * Same view definition produces:
 *   - HTML        for human-visual rendering
 *   - Markdown    for LLM context (token-efficient summaries)
 *   - Text        for terminal output and text-only models
 *
 * Pairs with scene-otel for emission. Daslab platform builds on it.
 */

// Core
export {
  defineView,
  escapeHtml,
  stripTags,
  truncate,
  type ViewDef,
  type JSONSchema,
} from "./view.js";

export {
  defineAsset,
  type AssetDef,
} from "./asset.js";

// Built-in primitives
export * as primitives from "./views/primitives.js";

// Asset library
export { Gmail }          from "./assets/gmail.js";
export { Salesforce }     from "./assets/salesforce.js";
export { Slack }          from "./assets/slack.js";
export { GoogleSheets }   from "./assets/google_sheets.js";
export { GoogleCalendar } from "./assets/google_calendar.js";
export { Airtable }       from "./assets/airtable.js";
export { Jira }           from "./assets/jira.js";
export { Notion }         from "./assets/notion.js";
export { Stripe }         from "./assets/stripe.js";
export { GitHub }         from "./assets/github.js";

// Asset registry — useful for the gallery + auto-discovery
import { Gmail }          from "./assets/gmail.js";
import { Salesforce }     from "./assets/salesforce.js";
import { Slack }          from "./assets/slack.js";
import { GoogleSheets }   from "./assets/google_sheets.js";
import { GoogleCalendar } from "./assets/google_calendar.js";
import { Airtable }       from "./assets/airtable.js";
import { Jira }           from "./assets/jira.js";
import { Notion }         from "./assets/notion.js";
import { Stripe }         from "./assets/stripe.js";
import { GitHub }         from "./assets/github.js";

export const assets = {
  Gmail, Salesforce, Slack,
  GoogleSheets, GoogleCalendar, Airtable,
  Jira, Notion, Stripe, GitHub,
} as const;
