# scenecast

> One asset definition. One typed JSON shape. Many rendering targets. The agent's view of the world, cast onto any surface.

Typed asset shapes + visual + headless **views** for AI agents. Authors return **WidgetData** JSON per size; the framework converts:

- **JSON** (`WidgetData`) — the canonical primitive every author writes. Same JSON shape Daslab iOS, Daslab web, and any third-party renderer can consume.
- **HTML** — rendered from WidgetData for humans, dashboards, the [scene-otel](https://github.com/daslabhq/scene-otel) scrubber, iOS/web viewers
- **Markdown** — rendered from WidgetData for LLM context injection (3–5× cheaper in tokens than dumping raw JSON, while preserving the structure agents need to reason about)
- **Text** — rendered from WidgetData for terminals and text-only models
- **A2UI** — rendered from WidgetData as [A2UI v0.9](https://a2ui.org) envelope messages (`createSurface` + `updateComponents`) so the same scene can stream to any portable agent-UI client (Lit/React/Angular/Flutter/OpenClaw)
- **MCP Apps** — rendered from WidgetData as an [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) tool resource (`text/html;profile=mcp-app`) for iframe-based hosts: Claude, ChatGPT, VS Code, Goose, Cursor

[![A2UI v0.9](https://img.shields.io/badge/A2UI-v0.9-6366f1)](https://a2ui.org/specification/v0.9-a2ui/) [![MCP Apps](https://img.shields.io/badge/MCP%20Apps-supported-f59e0b)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) [![Spec-validated](https://img.shields.io/badge/spec-validated-10b981)](./src/render/a2ui.test.ts)

**Both 2026 agent-UI standards covered:**
- *A2UI camp (declarative, native-rendered):* [`@a2ui/lit`](https://a2ui.org/reference/renderers/) · [`@a2ui/react`](https://a2ui.org/reference/renderers/) · [`@a2ui/angular`](https://a2ui.org/reference/renderers/) · [Flutter GenUI](https://docs.flutter.dev/ai/genui) · [OpenClaw Canvas](https://docs.openclaw.ai/platforms/mac/canvas) · [ADK Web](https://github.com/google/adk-web) · [CopilotKit / AG-UI](https://www.copilotkit.ai/) · [json-render](https://json-render.dev/docs/a2ui)
- *MCP Apps camp (sandboxed iframe):* [Claude](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) · [ChatGPT](https://developers.openai.com/apps-sdk/) · VS Code · Goose · Cursor

A2UI output is validated against Google's `@a2ui/web_core/v0_9` Zod schemas in CI; MCP Apps bundles ship a `tools/call` postMessage bridge per the MCP Apps spec.

Ships with **7 canonical types** in core — abstract primitives any vendor can implement: **Email**, **Message**, **Contact**, **Event**, **Task**, **Document**, **Mesh** (3D file in any format). Plus a library of widget primitives (Icon, Stack, List, Table, Metric, MetricGrid, KeyValue, Status, Document, Calendar, Plan, Empty, **Model3D**).

The **Mesh** type is the spatial seam — domain extensions like `protein/structure`, `robot/arm`, `printable/object`, `lab/labware` all `extends: ["mesh/file"]` and inherit format-discriminated rendering (`<model-viewer>` for glb/gltf/usdz today; Mol*, urdf-loader, three-stl-loader to follow). Same multi-target pipeline as Email — agents reason about a 3D asset in the same compact Markdown summary they use for everything else.

**Vendor extensions ship with benchmarks, not core.** Gmail, Slack, Salesforce, SAP S/4HANA — these live in **benchmark-scoped repos** like [`scenebench`](https://github.com/daslabhq/scenebench), which delivers scenecast extensions for every vendor in its benchmark domain. Each benchmark gets a magnet URL on `daslab.dev` (e.g. `daslab.dev/labs/automationbench`, `daslab.dev/s4bench`) showing its tasks, vendor schemas, and a leaderboard — scrubbable and scored.

Vendor types declare `extends: ["email/mailbox"]` etc. — tools that consume canonical types work uniformly across all vendors that implement them.

**[Live gallery →](https://daslabhq.github.io/scenecast/)**

## Install

```bash
npm install scenecast
```

## Use

```ts
import { Email } from "scenecast";

const inboxState = { messages: await fetchInbox() };  // any vendor — Gmail, Outlook, IMAP, …

// Visual — drop into any HTML surface
document.querySelector("#inbox")!.innerHTML =
  Email.defaultView.toHTML(inboxState, { size: "medium" });

// Headless — feed your agent compact, structured context
const ctx = Email.defaultView.toMarkdown(inboxState, { size: "medium" });
//   "Inbox (5 messages, 3 unread)
//
//    - **Invoice #4421 — overdue** — from alice@vendor.com · unread
//    - **Quick question about Q2 plan** — from ceo@company.com · unread
//    - …"

await llm.chat({ messages: [{ role: "user", content: ctx }, ...] });
```

### Render to A2UI for any portable agent-UI client

```ts
import { Email, render } from "scenecast";

const widget   = Email.defaultView.toJSON(inboxState, { size: "medium" });
const messages = render.renderA2UI(widget, { surfaceId: "inbox-1" });
const wire     = render.toA2UIJSONL(messages);
//   {"version":"v0.9","createSurface":{"surfaceId":"inbox-1","catalogId":"…/basic-catalog"}}
//   {"version":"v0.9","updateComponents":{"surfaceId":"inbox-1","components":[
//     {"id":"root","component":"Column","children":["c2","c4"]},
//     {"id":"c2","component":"Text","text":"Inbox","variant":"h2"},
//     …
//   ]}}

// stream `wire` to any A2UI v0.9 client — @a2ui/lit, @a2ui/react,
// Flutter GenUI, OpenClaw Canvas, ADK Web, CopilotKit, …
ws.send(wire);
```

### Render to MCP Apps for Claude / ChatGPT / VS Code / Goose / Cursor

```ts
import { Email, render } from "scenecast";

const widget   = Email.defaultView.toJSON(inboxState, { size: "medium" });
const resource = render.renderMCPApp(widget, { uri: "ui://inbox/widget" });
//   { uri:      "ui://inbox/widget",
//     mimeType: "text/html;profile=mcp-app",
//     text:     "<!DOCTYPE html>…<script>…tools/call bridge…</script>" }

// Return as a tool result resource — Claude, ChatGPT, VS Code et al.
// will render it in a sandboxed iframe and bridge events via JSON-RPC
// over postMessage on the ui/* namespace.
return { content: [{ type: "resource", resource }] };
```

The same `WidgetData` flows to every renderer — your agent emits structure once and humans, terminals, LLMs, A2UI clients, and MCP-Apps hosts all consume from one source.

### Addressability — every sub-element is anchorable

Selections, annotations, deep links, agent tool targets, scene-otel spans — they all need to *address* a specific row, step, event, or 3D object inside a widget. The asset is the atom; addressing has to live on the atom.

Every WidgetData sub-element with stable identity (`ListItem`, `PlanStep`, `CalendarEventEntry`, `MetricWidget`, …) carries an optional `id?: string`. Renderers emit `data-widget-anchor="<selector>"` on each rendered element using a small grammar:

```
widget                        whole asset
item[<id>]                    list / calendar item
row[<index>] | row[<id>]      table row
field[<key>]                  keyed field (KeyValue, Status detail)
step[<id>]                    plan step
metric[<id>]                  metric in a metric_grid
zone[<name>]                  floorplan zone
object[<id>]                  spatial scene placed item
surface[<id>]                 3D mesh face / glTF node
point[<x>,<y>] | point[<x>,<y>,<z>]   raw 2D / 3D point
```

```ts
import { anchor, anchorRef, parseAnchor } from "scenecast";

anchorRef("inbox-1", anchor.item("m4"));
//   { asset_id: "inbox-1", anchor: "item[m4]" }

parseAnchor("point[1.2,0.5,2.3]");
//   { kind: "point", x: 1.2, y: 0.5, z: 2.3 }
```

scenecast doesn't render annotations — that's a runtime concern (drawing arrows, badges, comment popovers requires geometry the type system doesn't have). What it owns is the **contract**: every consumer reads the same selectors, the same atoms, the same world model.

## Why this exists

Today most agents do one of two things with their world state, and both are bad:

1. **Dump raw JSON into the context** — wastes tokens, hurts comprehension, makes long-running agents expensive
2. **Hand-write a custom summarizer per app** — every team rebuilds Gmail-summarize, Salesforce-summarize, Stripe-summarize, … — none consistent, none shared

scenecast gives you **one definition, five rendering targets, ten apps batteries-included.** Lazy users get good defaults. Power users override per view.

## API

### `defineAsset({ type, schema, defaultView, … })`

```ts
import { defineAsset, defineView } from "scenecast";

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
import { primitives } from "scenecast";

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
import { Gmail } from "scenecast";
import { scene } from "scene-otel";

scene.set(Gmail.type, world.gmail);              // schema-validated emit
```

The scene-otel scrubber auto-detects registered scenecast assets and renders cards with the asset's default view.

## Schemas

The canonical `WidgetData` JSON Schema is published at [`schemas/scenecast.widgets.v0.json`](./schemas/scenecast.widgets.v0.json) — every widget kind (Table, Metric, List, …, Model3D) with its required + optional fields. Use it to validate views authored outside the TypeScript library.

## Roadmap

v0.1.0 (current)

- ✅ `defineAsset` + `defineView` core
- ✅ Multi-format render: HTML + Markdown + Text + A2UI v0.9 + MCP Apps
- ✅ A2UI output validated against `@a2ui/web_core/v0_9` Zod schemas in CI
- ✅ MCP Apps bundle ships the `tools/call` postMessage bridge for Claude / ChatGPT / VS Code / Goose / Cursor
- ✅ Widget primitive library: Icon · Stack · List · Table · Metric · MetricGrid · KeyValue · Status · Document · Calendar · Plan · Empty · Model3D
- ✅ 7 canonical types with mock state — Email, Message, Contact, Event, Task, Document, Mesh
- ✅ Live gallery showing every asset side-by-side in HTML, Markdown, live A2UI (`@a2ui/lit`), and an MCP Apps sandboxed iframe — including a live `<model-viewer>` rendering of the Mesh asset
- ✅ Anchor grammar — every sub-element is addressable (`item[<id>]`, `row[<idx>]`, `field[<key>]`, `step[<id>]`, `metric[<id>]`, `point[<x>,<y>,<z>]`, …) so consumers can bind selections, annotations, agent tool targets to specific rows / steps / events without reinventing addressing

Coming next

- **Native A2UI catalog** — publish a scenecast catalog so renderers render higher-level widgets (Plan, Status, Calendar) natively instead of falling back to basic-catalog primitives
- **Incremental A2UI updates** — emit `updateComponents` patches per scene change instead of full snapshots
- **A2UI action ingest** — wire client-side button taps back to tool invocations
- **Image-format render** — Satori-based PNG rendering for vision-capable models
- **Action handlers** — views declare `actions: { approve, redo, send }`; runtime routes scene action events
- **`defineCheck`** — LLM-judged predicates as a sibling primitive (composable into milestones)
- **AutomationBench bridge** — auto-translate AB's `assertions` to milestones; visualize first-unsatisfiable-step
- **More assets** — HubSpot, Asana, Trello, Zoom, Linear, …

## License

MIT. See [LICENSE](./LICENSE).

## Related

- [`scene-otel`](https://github.com/daslabhq/scene-otel) — wire format for snapshotting agent state to OTel events. Pairs naturally — scenecast renders what scene-otel snapshots.
- [`scenebench`](https://github.com/daslabhq/scenebench) — open harness for running, measuring, and visualizing agent benchmarks. Vendor types are authored with scenecast.
- [`scenegrad`](https://github.com/daslabhq/scenegrad) — runtime goal assertions for agents. Scenecast schemas describe what is; scenegrad asserts what must be.
- [`agent-otel`](https://github.com/mirkokiefer/agent-otel) — OTel router for agent telemetry.
- [`autocompile`](https://github.com/mirkokiefer/autocompile) — observes repeated agent runs, compiles invariant parts to code.
