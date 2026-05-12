/**
 * renderMCPApp(WidgetData) → MCP Apps tool resource.
 *
 * MCP Apps is the iframe-based agent-UI standard adopted by Anthropic
 * (Claude) and OpenAI (ChatGPT Apps SDK), Microsoft (VS Code), Goose,
 * and Cursor. Tools return an HTML bundle as a resource; the host
 * renders it in a sandboxed iframe and bridges events via JSON-RPC
 * over postMessage on the `ui/*` namespace.
 *
 * Spec: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
 *       https://developers.openai.com/apps-sdk/build/chatgpt-ui
 *
 * scenecast's role: take a WidgetData, render the same HTML our
 * renderHTML emits, wrap it with the MCP Apps postMessage bridge so
 * any data-tool-call element fires `tools/call` JSON-RPC back to the
 * host. Fits next to renderA2UI as a parallel distribution target —
 * one source of truth, two rival agent-UI standards covered.
 *
 * Companion to OpenAI's @openai/apps-sdk-ui and Anthropic's
 * @modelcontextprotocol/ext-apps SDK packages, which the host side
 * uses to register/serve resources.
 */

import type { WidgetData } from "../widgets.js";
import { escapeHtml } from "../view.js";
import { renderHTML } from "./html.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Inline the canonical widgets.css so the bundle renders correctly inside
 * a sandboxed iframe (which won't load any outer stylesheet). Read once
 * at module load — cheap, and the file is part of the published package.
 */
const WIDGETS_CSS = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "..", "styles", "widgets.css"), "utf8");
})();

/** The shape of an MCP resource. Hosts (Claude, ChatGPT, …) read this directly. */
export interface MCPAppResource {
  /** ui:// URI the tool declared via _meta.ui.resourceUri. */
  uri:      string;
  /** MCP Apps MIME type. Hosts route on this. */
  mimeType: "text/html;profile=mcp-app";
  /** The HTML bundle. Self-contained — no external scripts required. */
  text:     string;
}

export interface RenderMCPAppOpts {
  /** ui:// URI for this resource. Defaults to `ui://scenecast/widget`. */
  uri?:   string;
  /** Document title (shown by some hosts in window chrome). */
  title?: string;
  /**
   * If true, the WidgetData is embedded inline so the bundle renders
   * immediately without waiting for `ui/notifications/tool-result`.
   * Useful for static demos / gallery previews. Default: true.
   */
  inlineState?: boolean;
  /**
   * Additional `<style>` rules concatenated into the bundle. Hosts
   * apply their own typography; keep this minimal.
   */
  extraCss?: string;
}

const DEFAULT_URI   = "ui://scenecast/widget";
const DEFAULT_TITLE = "scenecast widget";
const MIME_TYPE     = "text/html;profile=mcp-app" as const;

export function renderMCPApp(w: WidgetData, opts: RenderMCPAppOpts = {}): MCPAppResource {
  const uri          = opts.uri          ?? DEFAULT_URI;
  const title        = opts.title        ?? DEFAULT_TITLE;
  const inlineState  = opts.inlineState  ?? true;
  const innerHtml    = renderHTML(w);
  const initialState = inlineState ? JSON.stringify(w) : "null";

  const text = buildBundle({
    title,
    innerHtml,
    initialState,
    extraCss: opts.extraCss ?? "",
  });

  return { uri, mimeType: MIME_TYPE, text };
}

interface BundleArgs {
  title:        string;
  innerHtml:    string;
  initialState: string;
  extraCss:     string;
}

function buildBundle(a: BundleArgs): string {
  // If the rendered HTML uses <model-viewer>, lazy-load Google's reference
  // implementation in the bundle. Same dedupe-by-URL behaviour browsers
  // give to top-level page loads — safe to include unconditionally per
  // bundle even if the host already loaded it.
  const needsModelViewer = a.innerHtml.includes("<model-viewer");
  const modelViewerScript = needsModelViewer
    ? `\n<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(a.title)}</title>${modelViewerScript}
<style>
  :root {
    color-scheme: light dark;
    /* CSS variables that widgets.css consumes — set sensible defaults
     * here so the bundle renders standalone. Hosts can override these
     * by injecting their own :root rule before our <style>. */
    --fg:      #0f172a;
    --muted:   #64748b;
    --border:  #e2e8f0;
    --bg:      #f8fafc;
    --accent:  #6366f1;
    --green:   #10b981;
    --red:     #ef4444;
  }
  body { margin: 0; font: 14px/1.5 ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif; background: transparent; color: var(--fg); }
  #scenecast-root { padding: 16px; }
  ${WIDGETS_CSS}
  ${a.extraCss}
</style>
</head>
<body>
<div id="scenecast-root">${a.innerHtml}</div>
<script type="module">
  // ---- MCP Apps bridge — JSON-RPC 2.0 over window.parent.postMessage ----
  // Spec: hosts deliver tool results via { method: "ui/notifications/tool-result", params: { structuredContent } }
  //       bundles invoke tools via { method: "tools/call", params: { name, arguments } }
  let nextId = 1;

  const initialState = ${a.initialState};

  function rpc(method, params) {
    window.parent.postMessage(
      { jsonrpc: "2.0", id: String(nextId++), method, params: params ?? {} },
      "*",
    );
  }

  // Public bridge — bundles or developer-tools can drive it.
  window.scenecast = {
    initialState,
    /** Call a host-registered tool by name. */
    callTool: (name, args) => rpc("tools/call", { name, arguments: args ?? {} }),
    /** Post a follow-up message to the conversation. */
    postMessage: (text) => rpc("ui/message", { content: [{ type: "text", text }] }),
    /** Sync UI-derived state into the model's context. */
    updateModelContext: (content) => rpc("ui/update-model-context", { content }),
  };

  // Wire any element with [data-tool-call] to fire tools/call on click.
  // Use [data-tool-args] (JSON) to pass arguments.
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("[data-tool-call]");
    if (!t) return;
    e.preventDefault();
    const name = t.getAttribute("data-tool-call");
    let args = {};
    const raw = t.getAttribute("data-tool-args");
    if (raw) { try { args = JSON.parse(raw); } catch {} }
    window.scenecast.callTool(name, args);
  });

  // Receive tool results / state updates from the host.
  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.method === "ui/notifications/tool-result") {
      const next = msg.params && msg.params.structuredContent;
      if (next) {
        window.scenecast.initialState = next;
        window.dispatchEvent(new CustomEvent("scenecast:state", { detail: next }));
      }
    }
  });
</script>
</body>
</html>`;
}
