# scene-state

> One asset definition. One typed JSON shape. Many rendering targets. The agent's view of the world.

Typed asset shapes + visual + headless **views** for AI agents. Authors return **WidgetData** JSON per size; the framework converts:

- **JSON** (`WidgetData`) — the canonical primitive every author writes. Same JSON shape Daslab iOS, Daslab web, and any third-party renderer can consume.
- **HTML** — rendered from WidgetData for humans, dashboards, the [scene-otel](https://github.com/daslabhq/scene-otel) scrubber, iOS/web viewers
- **Markdown** — rendered from WidgetData for LLM context injection (3–5× cheaper in tokens than dumping raw JSON, while preserving the structure agents need to reason about)
- **Text** — rendered from WidgetData for terminals and text-only models

Ships with **10 typed assets** out of the box (Gmail, Salesforce, Slack, Google Sheets, Google Calendar, Airtable, Jira, Notion, Stripe, GitHub) plus a library of widget primitives (Table, Metric, List, KeyValue, Calendar, Status, Document, Image, Plan, Stack).

**[Live gallery →](https://daslabhq.github.io/scene-state/)**

## Install

```bash
npm install scene-state
```

## Use

```ts
import { Gmail, Salesforce } from "scene-state";

const inboxState = await fetchGmail();        // your code

// Visual — drop into any HTML surface
document.querySelector("#inbox")!.innerHTML =
  Gmail.defaultView.toHTML(inboxState);

// Headless — feed your agent compact, structured context
const ctx = Gmail.defaultView.toMarkdown(inboxState);
//   "Inbox (5 messages, 3 unread)
//
//    - **Invoice #4421 — overdue** — from alice@vendor.com · unread
//    - **Quick question about Q2 plan** — from ceo@company.com · unread
//    - …"

await llm.chat({ messages: [{ role: "user", content: ctx }, ...] });
```

## Why this exists

Today most agents do one of two things with their world state, and both are bad:

1. **Dump raw JSON into the context** — wastes tokens, hurts comprehension, makes long-running agents expensive
2. **Hand-write a custom summarizer per app** — every team rebuilds Gmail-summarize, Salesforce-summarize, Stripe-summarize, … — none consistent, none shared

scene-state gives you **one definition, three rendering targets, ten apps batteries-included.** Lazy users get good defaults. Power users override per view.

## API

### `defineAsset({ type, schema, defaultView, … })`

```ts
import { defineAsset, defineView } from "scene-state";

const Gmail = defineAsset({
  type:        "gmail/account",
  schema:      gmailSchema,        // JSON Schema for the asset's state
  defaultView: GmailInboxView,     // see below
  views:       { drafts: GmailDraftsView },
  secretFields: ["access_token"],
  mockState:   () => ({ messages: [...] }),  // for tests + galleries
});
```

### `defineView({ name, toHTML, toMarkdown, toText? })`

```ts
const GmailInboxView = defineView<GmailState>({
  name: "GmailInbox",
  toHTML(state) {
    return `<div>… HTML …</div>`;
  },
  toMarkdown(state) {
    const unread = state.messages.filter(m => !m.is_read).length;
    return `Inbox (${state.messages.length} msgs, ${unread} unread)\n\n` +
      state.messages.map(m => `- **${m.subject}** — from ${m.from_}`).join("\n");
  },
  // toText defaults to stripping HTML tags if not provided
});
```

### View primitives

Most asset views compose a small library of generic primitives:

```ts
import { primitives } from "scene-state";

const { TableView, MetricView, ListView, KeyValueView,
        CalendarView, StatusView, DocumentView, ImageView, PlanView } = primitives;

TableView.toHTML({
  title:   "Open opportunities",
  columns: ["Name", "Amount", "Stage"],
  rows:    [{ Name: "Meridian", Amount: "$245k", Stage: "Won" }, …],
});
```

Each primitive ships HTML + Markdown out of the box.

## Pairs with `scene-otel`

When emitting trace events with [scene-otel](https://github.com/daslabhq/scene-otel), pass the asset directly — the schema becomes the type contract for the snapshot, and the default view powers the scrubber's rendering automatically:

```ts
import { Gmail } from "scene-state";
import { scene } from "scene-otel";

scene.set(Gmail.type, world.gmail);              // schema-validated emit
scene.intent(Gmail.type, { tool: "gmail_send_email", args });
scene.milestone("inbox_clean", {
  asset: Gmail.type,
  must_satisfy: { count: { unread: 0 } },
});
```

The scene-otel scrubber auto-detects registered scene-state assets and renders cards with the asset's default view.

## Schemas

The 49 JSON Schemas exported from [Zapier's AutomationBench](https://github.com/zapier/AutomationBench) (covering 49 SaaS apps) are available under [`schemas/automationbench/`](./schemas/automationbench) for use as your asset shapes. The 10 batteries-included assets here use that catalogue as their seed.

## Roadmap

v0.1.0 (current)

- ✅ `defineAsset` + `defineView` core
- ✅ Multi-format render: HTML + Markdown + Text
- ✅ View primitives library: Table, Metric, List, KeyValue, Calendar, Status, Document, Image, Plan
- ✅ 10 batteries-included assets with mock state
- ✅ Live gallery showing every asset in both formats

Coming next

- **Image-format render** — Satori-based PNG rendering for vision-capable models
- **Action handlers** — views declare `actions: { approve, redo, send }`; runtime routes scene action events
- **`defineCheck`** — LLM-judged predicates as a sibling primitive (composable into milestones)
- **AutomationBench bridge** — auto-translate AB's `assertions` to milestones; visualize first-unsatisfiable-step
- **More assets** — HubSpot, Asana, Trello, Zoom, Linear, …

## License

MIT. See [LICENSE](./LICENSE).

## Related

- [`scene-otel`](https://github.com/daslabhq/scene-otel) — wire format for snapshotting agent scene-state to OTel events. Pairs naturally.
- [`agent-otel`](https://github.com/mirkokiefer/agent-otel) — OTel router for agent telemetry.
- [`autocompile`](https://github.com/mirkokiefer/autocompile) — observes repeated agent runs, compiles invariant parts to code.
