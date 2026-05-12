/**
 * Tests for the MCP Apps renderer.
 *
 * Validates the resource shape (uri / mimeType / text), required bundle
 * structure (postMessage bridge, doctype, scenecast root), and that
 * every WidgetData kind produces a non-empty bundle.
 */

import { test, expect, describe } from "bun:test";
import { renderMCPApp } from "./mcp_apps.js";
import type { WidgetData } from "../widgets.js";

function assertWellFormed(html: string) {
  expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(html).toContain('<div id="scenecast-root">');
  // postMessage bridge essentials
  expect(html).toContain("window.parent.postMessage");
  expect(html).toContain('"tools/call"');
  expect(html).toContain('"ui/message"');
  expect(html).toContain('"ui/update-model-context"');
  expect(html).toContain('"ui/notifications/tool-result"');
  expect(html).toContain("window.scenecast");
}

describe("renderMCPApp", () => {
  test("returns a valid MCP resource shape", () => {
    const r = renderMCPApp({ type: "empty", message: "hi" });
    expect(r.uri).toBe("ui://scenecast/widget");
    expect(r.mimeType).toBe("text/html;profile=mcp-app");
    assertWellFormed(r.text);
  });

  test("respects uri/title overrides", () => {
    const r = renderMCPApp({ type: "empty" }, {
      uri:   "ui://daslab/scene/abc",
      title: "Sprint board",
    });
    expect(r.uri).toBe("ui://daslab/scene/abc");
    expect(r.text).toContain("<title>Sprint board</title>");
  });

  test("escapes title to prevent injection", () => {
    const r = renderMCPApp({ type: "empty" }, {
      title: "</title><script>alert(1)</script>",
    });
    expect(r.text).not.toContain("<script>alert(1)</script>");
    expect(r.text).toContain("&lt;script&gt;");
  });

  test("inlines WidgetData as initialState by default", () => {
    const w: WidgetData = { type: "metric", value: 42, label: "Requests" };
    const r = renderMCPApp(w);
    expect(r.text).toContain('"label":"Requests"');
    expect(r.text).toContain('"value":42');
  });

  test("inlineState:false yields null initialState", () => {
    const r = renderMCPApp({ type: "empty" }, { inlineState: false });
    expect(r.text).toContain("const initialState = null");
  });

  test("extraCss is concatenated into the head", () => {
    const r = renderMCPApp({ type: "empty" }, {
      extraCss: ".scenecast-root { color: rebeccapurple; }",
    });
    expect(r.text).toContain("rebeccapurple");
  });

  // Cover every member of the WidgetData union.
  const samples: WidgetData[] = [
    { type: "icon", glyph: "<svg/>", color: "blue", label: "Inbox", badge: 3 },
    {
      type: "stack",
      header: { title: "Today" },
      body: [{ type: "metric", value: 42, label: "Requests" }],
    },
    { type: "list", title: "Tasks", items: [{ title: "Ship MCP Apps" }] },
    { type: "table", columns: ["a"], rows: [{ a: 1 }] },
    { type: "metric", value: 99, label: "Uptime", unit: "%" },
    { type: "metric_grid", metrics: [{ type: "metric", value: 1, label: "x" }] },
    { type: "key_value", pairs: [{ key: "k", value: "v" }] },
    { type: "status", state: "ok", message: "All good" },
    { type: "document", body: "Hello" },
    { type: "calendar", events: [
      { title: "Standup", startsAt: "2026-05-08T09:00:00Z" },
    ]},
    { type: "plan", title: "P", steps: [{ label: "do it", status: "pending" }] },
    { type: "empty" },
  ];

  for (const w of samples) {
    test(`${w.type} → well-formed bundle`, () => {
      const r = renderMCPApp(w);
      expect(r.text.length).toBeGreaterThan(500);
      assertWellFormed(r.text);
    });
  }
});
