/**
 * Anchor grammar — round-trip and parser correctness.
 */

import { test, expect, describe } from "bun:test";
import {
  formatAnchor, parseAnchor, anchor, anchorRef,
  type AnchorSelector,
} from "./anchors.js";

describe("formatAnchor / parseAnchor round-trip", () => {
  const cases: AnchorSelector[] = [
    { kind: "widget" },
    { kind: "item",   id: "m1" },
    { kind: "item",   id: "u-uuid-with-dashes" },
    { kind: "row",    index: 3 },
    { kind: "row",    id: "order-42" },
    { kind: "field",  key: "email" },
    { kind: "step",   id: "do-it" },
    { kind: "metric", id: "uptime" },
    { kind: "zone",   name: "wet" },
    { kind: "object", id: "opentrons-flex" },
    { kind: "surface", id: "wall-1" },
    { kind: "point",  x: 1.2, y: 0.5 },
    { kind: "point",  x: 1.2, y: 0.5, z: 2.3 },
  ];
  for (const sel of cases) {
    test(`${formatAnchor(sel)} round-trips`, () => {
      const back = parseAnchor(formatAnchor(sel));
      expect(back).toEqual(sel);
    });
  }
});

describe("parseAnchor permissive forms", () => {
  test("empty string → widget", () => {
    expect(parseAnchor("")).toEqual({ kind: "widget" });
  });
  test("'widget' → widget", () => {
    expect(parseAnchor("widget")).toEqual({ kind: "widget" });
  });
  test("trims whitespace", () => {
    expect(parseAnchor("  item[m1]  ")).toEqual({ kind: "item", id: "m1" });
  });
  test("row[3] is positional, row[abc] is id", () => {
    expect(parseAnchor("row[3]")).toEqual({ kind: "row", index: 3 });
    expect(parseAnchor("row[abc]")).toEqual({ kind: "row", id: "abc" });
  });
  test("point[x,y] vs point[x,y,z]", () => {
    expect(parseAnchor("point[1,2]")).toEqual({ kind: "point", x: 1, y: 2 });
    expect(parseAnchor("point[1,2,3]")).toEqual({ kind: "point", x: 1, y: 2, z: 3 });
  });
  test("rejects unknown kind", () => {
    expect(() => parseAnchor("nonsense[x]")).toThrow(/unknown kind/);
  });
  test("rejects mangled forms", () => {
    expect(() => parseAnchor("item")).toThrow(/unrecognized/);
    expect(() => parseAnchor("point[1]")).toThrow(/2 or 3 coordinates/);
    expect(() => parseAnchor("point[1,bad]")).toThrow(/bad point coordinate/);
  });
});

describe("anchor builders + anchorRef", () => {
  test("builders return identical structures to literals", () => {
    expect(anchor.widget()).toEqual({ kind: "widget" });
    expect(anchor.item("m1")).toEqual({ kind: "item", id: "m1" });
    expect(anchor.row(3)).toEqual({ kind: "row", index: 3 });
    expect(anchor.row("order-42")).toEqual({ kind: "row", id: "order-42" });
    expect(anchor.field("email")).toEqual({ kind: "field", key: "email" });
    expect(anchor.point(1, 2)).toEqual({ kind: "point", x: 1, y: 2 });
    expect(anchor.point(1, 2, 3)).toEqual({ kind: "point", x: 1, y: 2, z: 3 });
  });

  test("anchorRef produces { asset_id, anchor? } wire shape", () => {
    expect(anchorRef("a-1")).toEqual({ asset_id: "a-1" });
    expect(anchorRef("a-1", anchor.widget())).toEqual({ asset_id: "a-1" });
    expect(anchorRef("a-1", anchor.item("m1"))).toEqual({
      asset_id: "a-1", anchor: "item[m1]",
    });
    expect(anchorRef("a-1", anchor.point(1.2, 0.5, 2.3))).toEqual({
      asset_id: "a-1", anchor: "point[1.2,0.5,2.3]",
    });
  });
});

describe("HTML renderer emits data-widget-anchor", () => {
  test("ListWidget items with id get item[id] anchors; ones without fall back to row[index]", async () => {
    const { renderHTML } = await import("./render/html.js");
    const html = renderHTML({
      type: "list",
      items: [
        { id: "m1", title: "with id" },
        { title: "without id" },
      ],
    });
    expect(html).toContain('data-widget-anchor="item[m1]"');
    expect(html).toContain('data-widget-anchor="row[1]"');
  });

  test("KeyValueWidget pairs get field[key] anchors", async () => {
    const { renderHTML } = await import("./render/html.js");
    const html = renderHTML({
      type: "key_value",
      pairs: [{ key: "email", value: "x@y.z" }],
    });
    expect(html).toContain('data-widget-anchor="field[email]"');
  });

  test("PlanWidget steps with id get step[id] anchors", async () => {
    const { renderHTML } = await import("./render/html.js");
    const html = renderHTML({
      type: "plan",
      title: "P",
      steps: [
        { id: "s1", label: "first",  status: "completed" },
        {           label: "second", status: "pending"  },
      ],
    });
    expect(html).toContain('data-widget-anchor="step[s1]"');
    expect(html).toContain('data-widget-anchor="row[1]"');
  });

  test("MetricWidget with id gets metric[id]; without id, no anchor", async () => {
    const { renderHTML } = await import("./render/html.js");
    const a = renderHTML({ type: "metric", id: "uptime", value: 99, label: "Uptime" });
    const b = renderHTML({ type: "metric",                value: 1,  label: "Plain"  });
    expect(a).toContain('data-widget-anchor="metric[uptime]"');
    expect(b).not.toContain("data-widget-anchor");
  });
});
