/**
 * Tests for the A2UI v0.9 renderer.
 *
 * Validates each emitted message against Google's official Zod schemas
 * shipped in @a2ui/web_core/v0_9 — if our output drifts from spec, these
 * tests fail loudly. Plus structural invariants: exactly one `root`,
 * unique ids, every children id resolves, no orphan components.
 */

import { test, expect, describe } from "bun:test";
import {
  CreateSurfaceMessageSchema,
  UpdateComponentsMessageSchema,
} from "@a2ui/web_core/v0_9";
import { renderA2UI, toA2UIJSONL, type A2UIMessage } from "./a2ui.js";
import type { WidgetData } from "../widgets.js";

function getUpdateComponents(msgs: A2UIMessage[]) {
  const m = msgs.find(x => "updateComponents" in x);
  if (!m || !("updateComponents" in m)) throw new Error("no updateComponents");
  return m.updateComponents;
}

function assertSpecCompliant(msgs: A2UIMessage[]): void {
  // 1) Exactly one createSurface, validated by Zod against the real spec.
  const create = msgs.find(m => "createSurface" in m);
  expect(create).toBeDefined();
  expect(() => CreateSurfaceMessageSchema.parse(create)).not.toThrow();

  // 2) updateComponents validates against the real spec.
  const update = msgs.find(m => "updateComponents" in m);
  expect(update).toBeDefined();
  expect(() => UpdateComponentsMessageSchema.parse(update)).not.toThrow();

  // 3) surfaceId matches between the two messages.
  const surfaceId = (create as any).createSurface.surfaceId;
  expect((update as any).updateComponents.surfaceId).toBe(surfaceId);

  // 4) Structural invariants on the component graph.
  const { components } = getUpdateComponents(msgs);

  // exactly one root
  const roots = components.filter(c => c.id === "root");
  expect(roots.length).toBe(1);

  // unique ids (every component in this renderer has one)
  const ids = components.map(c => c.id!);
  expect(new Set(ids).size).toBe(ids.length);

  // every children/child id reference resolves to a real component
  const idSet = new Set(ids);
  for (const c of components) {
    const refs: unknown[] = [];
    if (Array.isArray((c as any).children)) refs.push(...(c as any).children);
    if (typeof (c as any).child === "string") refs.push((c as any).child);
    for (const ref of refs) {
      expect(typeof ref).toBe("string");
      expect(idSet.has(ref as string)).toBe(true);
    }
  }

  // no orphans: every non-root component is referenced by something
  const referenced = new Set<string>();
  for (const c of components) {
    if (Array.isArray((c as any).children)) {
      for (const k of (c as any).children) referenced.add(k);
    }
    if (typeof (c as any).child === "string") referenced.add((c as any).child);
  }
  for (const id of ids) {
    if (id !== "root") expect(referenced.has(id)).toBe(true);
  }
}

describe("renderA2UI v0.9 spec compliance", () => {
  test("envelope round-trips through JSONL", () => {
    const w: WidgetData = { type: "empty", message: "nothing here" };
    const msgs = renderA2UI(w);
    const lines = toA2UIJSONL(msgs).trimEnd().split("\n");
    expect(lines.length).toBe(msgs.length);
    for (let i = 0; i < lines.length; i++) {
      expect(JSON.parse(lines[i])).toEqual(msgs[i] as any);
    }
  });

  test("respects surfaceId and catalogId overrides", () => {
    const msgs = renderA2UI(
      { type: "empty" },
      { surfaceId: "scene-42", catalogId: "https://example.com/catalogs/foo/v1" }
    );
    expect(msgs[0]).toEqual({
      version: "v0.9",
      createSurface: { surfaceId: "scene-42", catalogId: "https://example.com/catalogs/foo/v1" },
    });
  });

  // Cover every member of the WidgetData union.
  const samples: WidgetData[] = [
    { type: "icon", glyph: "<svg/>", color: "blue", label: "Inbox", badge: 3 },
    {
      type: "stack",
      header: { title: "Today", meta: "Mon" },
      body: [
        { type: "metric", value: 42, label: "Requests" },
        { type: "empty",  message: "no errors" },
      ],
    },
    { type: "list", title: "Tasks", items: [
      { title: "Ship A2UI", subtitle: "scenecast", badge: "P0" },
      { title: "Write tests" },
    ]},
    { type: "list", title: "Empty", items: [], empty: "all clear" },
    { type: "table", title: "Users", columns: ["name", "age"], rows: [
      { name: "Ada", age: 36 }, { name: "Linus", age: 55 },
    ]},
    { type: "metric", value: 99, label: "Uptime", unit: "%", trend: "up", trendValue: "+0.3%" },
    { type: "metric_grid", metrics: [
      { type: "metric", value: 1, label: "A" },
      { type: "metric", value: 2, label: "B" },
    ]},
    { type: "key_value", title: "Config", pairs: [
      { key: "env", value: "prod" }, { key: "region", value: "eu" },
    ]},
    { type: "status", state: "ok", message: "All good", details: [
      { key: "checks", value: "12/12" },
    ]},
    { type: "status", state: "fail", message: "Broken" },
    { type: "document", title: "Memo", byline: "fm", body: "Hello world" },
    { type: "calendar", title: "Sprint", events: [
      { title: "Standup", startsAt: "2026-05-08T09:00:00Z", location: "Zoom" },
    ]},
    { type: "plan", title: "Migration", steps: [
      { label: "Backup",  status: "completed" },
      { label: "Cutover", status: "in_progress", detail: "ETA 5m" },
      { label: "Verify",  status: "pending" },
    ]},
    { type: "empty" },
  ];

  for (const w of samples) {
    test(`${w.type} → spec-compliant A2UI envelope`, () => {
      const msgs = renderA2UI(w);
      assertSpecCompliant(msgs);
    });
  }
});
