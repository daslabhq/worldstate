/**
 * Document — canonical type for prose/text documents.
 *
 * Vendor implementations: Notion pages, Google Docs, Confluence, Coda,
 * Word docs, Markdown notes.
 */

import { defineAsset } from "../asset.js";
import { defineView, truncate } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

export interface DocumentRecord {
  id:         string;
  title:      string;
  body:       string;
  byline?:    string;
  modifiedAt?: string;
  tags?:      string[];
}

export interface DocumentState {
  documents: DocumentRecord[];
}

function featured(s: DocumentState): DocumentRecord | undefined {
  return [...s.documents]
    .sort((a, b) => (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? ""))[0];
}

const FeaturedDocumentView = defineView<DocumentState>({
  name: "FeaturedDocument",
  sizes: {
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.documentText,
      color: "yellow",
      label: "Docs",
      badge: s.documents.length || undefined,
    }),

    small: (s): WidgetData => {
      const f = featured(s);
      return {
        type: "stack",
        header: { glyph: ICONS.documentText, color: "yellow", title: `${s.documents.length} pages` },
        body: f ? [{
          type: "list",
          items: [{ id: f.id, title: truncate(f.title, 36), subtitle: f.modifiedAt ?? "" }],
        }] : [{ type: "empty", message: "no documents" }],
      };
    },

    medium: (s): WidgetData => {
      const f = featured(s);
      if (!f) return { type: "empty", message: "no documents" };
      return {
        type: "stack",
        header: { glyph: ICONS.documentText, color: "yellow", title: "Featured page" },
        body: [{
          type: "document",
          title: f.title,
          body: truncate(f.body, 320),
          byline: f.byline,
          meta: f.modifiedAt ? `modified ${f.modifiedAt}` : "",
        }],
      };
    },

    large: (s): WidgetData => {
      const sorted = [...s.documents].sort((a, b) =>
        (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? "")
      );
      const f = sorted[0];
      if (!f) return { type: "empty", message: "no documents" };
      return {
        type: "stack",
        header: { glyph: ICONS.documentText, color: "yellow", title: "Featured page" },
        body: [
          {
            type: "document",
            title: f.title,
            body: f.body,
            byline: f.byline,
            meta: f.modifiedAt ? `modified ${f.modifiedAt}` : "",
          },
          {
            type: "list",
            title: "More pages",
            items: sorted.slice(1, 6).map(d => ({
              id: d.id,
              title: d.title,
              subtitle: d.modifiedAt ?? "",
            })),
          },
        ],
      };
    },
  },
});

export const Document = defineAsset<DocumentState>({
  type: "document/collection",
  description: "Canonical document collection — pages with title + body.",
  schema: {
    type: "object",
    properties: { documents: { type: "array" } },
    required: ["documents"],
  },
  defaultView: FeaturedDocumentView,
  mockState: () => ({
    documents: [
      { id: "d1", title: "Q2 launch plan",                  body: "Overview\n\nWe're shipping the new agent runtime in three phases. Phase 1 (May 6) covers the core SDK; phase 2 (May 20) adds the visual scrubber; phase 3 (June 3) brings the AutomationBench integration to production with belief-vs-truth scoring.", byline: "ops team", modifiedAt: "2026-04-30", tags: ["plan"] },
      { id: "d2", title: "On-call runbook",                  body: "Step 1: check the on-call dashboard. Step 2: …", modifiedAt: "2026-04-29", tags: ["ops"] },
      { id: "d3", title: "Customer feedback · April",        body: "Top themes from this month's calls…", modifiedAt: "2026-04-28", tags: ["research"] },
    ],
  }),
});
