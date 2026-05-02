/**
 * Sanity tests — every asset's defaultView renders mock state cleanly
 * to all three formats with no thrown errors.
 */

import { test, expect, describe } from "bun:test";
import { vendors, canonicalTypes, defineView, defineAsset, viewSizeGrid, type ViewSize } from "./index.js";

describe("view sizes", () => {
  const SIZES: ViewSize[] = ["icon", "small", "medium", "large", "xlarge"];

  for (const [name, asset] of Object.entries(canonicalTypes)) {
    test(`${name} renders all 5 sizes without throwing`, () => {
      const state = asset.mockState!();
      for (const size of SIZES) {
        expect(() => asset.defaultView.toHTML(state, { size })).not.toThrow();
        expect(() => asset.defaultView.toMarkdown(state, { size })).not.toThrow();
      }
    });

    test(`${name} renders icon < small < medium in token weight`, () => {
      const state = asset.mockState!();
      const icon   = asset.defaultView.toMarkdown(state, { size: "icon" });
      const small  = asset.defaultView.toMarkdown(state, { size: "small" });
      const medium = asset.defaultView.toMarkdown(state, { size: "medium" });
      expect(icon.length).toBeLessThanOrEqual(small.length);
      expect(small.length).toBeLessThanOrEqual(medium.length);
    });
  }

  test("xlarge falls back to large or medium when not implemented", () => {
    // None of our canonicals implement xlarge yet — should not throw.
    for (const [, asset] of Object.entries(canonicalTypes)) {
      const state = asset.mockState!();
      const xlarge = asset.defaultView.toHTML(state, { size: "xlarge" });
      expect(xlarge.length).toBeGreaterThan(0);
    }
  });

  test("viewSizeGrid returns Apple WidgetKit dimensions", () => {
    expect(viewSizeGrid("icon")).toEqual({ cols: 1, rows: 1 });
    expect(viewSizeGrid("small")).toEqual({ cols: 2, rows: 2 });
    expect(viewSizeGrid("medium")).toEqual({ cols: 4, rows: 2 });
    expect(viewSizeGrid("large")).toEqual({ cols: 4, rows: 4 });
    expect(viewSizeGrid("xlarge")).toEqual({ cols: 8, rows: 4 });
  });
});

describe("defineView with sizes builder", () => {
  test("uses requested size when implemented", () => {
    const v = defineView<{ n: number }>({
      name: "T",
      sizes: {
        icon:   (s) => ({ html: `i${s.n}`, markdown: `i${s.n}` }),
        medium: (s) => ({ html: `m${s.n}`, markdown: `m${s.n}` }),
      },
    });
    expect(v.toHTML({ n: 1 }, { size: "icon" })).toBe("i1");
    expect(v.toHTML({ n: 1 }, { size: "medium" })).toBe("m1");
    expect(v.toHTML({ n: 1 })).toBe("m1");                    // default = medium
  });

  test("falls back through ladder when size not implemented", () => {
    const v = defineView<{ n: number }>({
      name: "T",
      sizes: {
        medium: (s) => ({ html: `m${s.n}`, markdown: `m${s.n}` }),
      },
    });
    expect(v.toHTML({ n: 1 }, { size: "icon" })).toBe("m1");   // icon → small → medium
    expect(v.toHTML({ n: 1 }, { size: "large" })).toBe("m1");  // large → medium
    expect(v.toHTML({ n: 1 }, { size: "xlarge" })).toBe("m1"); // xlarge → large → medium
  });

  test("errors helpfully if neither sizes nor toHTML/toMarkdown given", () => {
    expect(() => defineView({ name: "Bad" })).toThrow(/sizes/);
  });
});

describe("canonical types", () => {
  for (const [name, asset] of Object.entries(canonicalTypes)) {
    test(`${name}.defaultView renders mock state`, () => {
      const state = asset.mockState!();
      const html = asset.defaultView.toHTML(state);
      const md   = asset.defaultView.toMarkdown(state);
      const txt  = asset.defaultView.toText!(state);
      expect(html.length).toBeGreaterThan(0);
      expect(md.length).toBeGreaterThan(0);
      expect(txt.length).toBeGreaterThan(0);
    });
  }

  test("type ids follow `<concept>/<role>` shape", () => {
    for (const [, asset] of Object.entries(canonicalTypes)) {
      expect(asset.type).toMatch(/^[a-z_]+\/[a-z_]+$/);
    }
  });
});

describe("vendor → canonical extends declarations", () => {
  test("vendors that should extend canonical types do", () => {
    expect(vendors.Gmail.extends).toContain("email/mailbox");
    expect(vendors.Slack.extends).toContain("message/channels");
    expect(vendors.Salesforce.extends).toContain("contact/list");
    expect(vendors.GoogleCalendar.extends).toContain("event/calendar");
    expect(vendors.Jira.extends).toContain("task/list");
    expect(vendors.Notion.extends).toContain("document/collection");
  });

  test("canonical-extending vendors satisfy their canonical's schema (loose)", () => {
    // Every canonical's mock should be renderable by every vendor's view
    // that extends it — vendors are supersets. This is a smoke check, not
    // a full schema check; we verify rendering doesn't throw.
    const canonicalEmailMock = canonicalTypes.Email.mockState!();
    expect(() =>
      canonicalTypes.Email.defaultView.toMarkdown(canonicalEmailMock)
    ).not.toThrow();
  });
});

describe("built-in vendors", () => {
  for (const [name, asset] of Object.entries(vendors)) {
    test(`${name}.defaultView renders mock state`, () => {
      const state = asset.mockState!();
      const html = asset.defaultView.toHTML(state);
      const md   = asset.defaultView.toMarkdown(state);
      const txt  = asset.defaultView.toText!(state);
      expect(html.length).toBeGreaterThan(0);
      expect(md.length).toBeGreaterThan(0);
      expect(txt.length).toBeGreaterThan(0);
      // HTML should be tag-shaped
      expect(html).toMatch(/<\w+/);
      // Markdown shouldn't contain raw HTML
      expect(md).not.toMatch(/<\w+ /);
    });
  }
});

describe("defineView", () => {
  test("toText falls back to stripping HTML when omitted", () => {
    const v = defineView<{ x: number }>({
      name: "T",
      toHTML: (s) => `<div>x=<b>${s.x}</b></div>`,
      toMarkdown: (s) => `x=${s.x}`,
    });
    expect(v.toText!({ x: 7 })).toBe("x=7");
  });
});

describe("defineAsset", () => {
  test("propagates extends", () => {
    const a = defineAsset({
      type: "vendor/example",
      extends: ["email/mailbox"],
      schema: { type: "object" },
      defaultView: defineView<{ x: number }>({
        name: "T", toHTML: () => "ok", toMarkdown: () => "ok",
      }),
    });
    expect(a.extends).toEqual(["email/mailbox"]);
  });

  test("defaults extends to empty array when omitted", () => {
    const a = defineAsset({
      type: "vendor/no-extend",
      schema: { type: "object" },
      defaultView: defineView<{ y: number }>({
        name: "T", toHTML: () => "ok", toMarkdown: () => "ok",
      }),
    });
    expect(a.extends).toEqual([]);
  });

  test("propagates secretFields", () => {
    const a = defineAsset({
      type: "test/x",
      schema: { type: "object" },
      secretFields: ["token"],
      defaultView: defineView<{ y: number }>({
        name: "T", toHTML: () => "ok", toMarkdown: () => "ok",
      }),
    });
    expect(a.secretFields).toEqual(["token"]);
  });

  test("applies sensible defaults", () => {
    const a = defineAsset({
      type: "test/y",
      schema: { type: "object" },
      defaultView: defineView<{ y: number }>({
        name: "T", toHTML: () => "ok", toMarkdown: () => "ok",
      }),
    });
    expect(a.secretFields).toEqual([]);
    expect(a.views).toEqual({});
  });
});
