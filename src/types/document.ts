/**
 * Document — canonical type for prose/text documents.
 *
 * Vendor implementations: Notion pages, Google Docs, Confluence, Coda,
 * Word docs, Markdown notes.
 */

import { defineAsset } from "../asset.js";
import { defineView, escapeHtml, truncate } from "../view.js";
import { DocumentView } from "../views/primitives.js";

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
    icon: (s) => ({
      html: `<div class="ws-app-icon"><div class="ws-app-emoji">📓</div><div class="ws-app-name">Docs</div>${s.documents.length ? `<div class="ws-app-badge">${s.documents.length}</div>` : ""}</div>`,
      markdown: `📓 Docs · ${s.documents.length}`,
    }),
    small: (s) => {
      const f = featured(s);
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">📓 ${s.documents.length} pages</div>
          ${f ? `<div class="ws-small-body">
            <div class="ws-small-title">${escapeHtml(truncate(f.title, 36))}</div>
            <div class="ws-small-sub">${escapeHtml(f.modifiedAt ?? "")}</div>
          </div>` : ""}
        </div>`,
        markdown: f
          ? `**Docs** · ${s.documents.length} pages\n_latest:_ "${truncate(f.title, 50)}"${f.modifiedAt ? ` (${f.modifiedAt})` : ""}`
          : `**Docs** · empty`,
      };
    },
    medium: (s) => {
      const f = featured(s);
      if (!f) return { html: `<div class="ws-empty">no documents</div>`, markdown: "(no docs)" };
      return {
        html: DocumentView.toHTML({
          title: f.title,
          body:  truncate(f.body, 400),
          byline: f.byline,
          meta:   f.modifiedAt ? `modified ${f.modifiedAt}` : "",
        }),
        markdown: `### ${f.title}\n\n${f.byline ? `_${f.byline}_\n\n` : ""}${truncate(f.body, 300)}`,
      };
    },
    large: (s) => {
      const sorted = [...s.documents].sort((a, b) => (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? ""));
      const f = sorted[0];
      if (!f) return { html: `<div class="ws-empty">no documents</div>`, markdown: "(no docs)" };
      const others = sorted.slice(1, 6).map(d =>
        `<li class="ws-li"><div class="ws-li-title">${escapeHtml(d.title)}</div><div class="ws-li-sub">${escapeHtml(d.modifiedAt ?? "")}</div></li>`
      ).join("");
      return {
        html: `${DocumentView.toHTML({
          title: f.title,
          body:  f.body,
          byline: f.byline,
          meta:   f.modifiedAt ? `modified ${f.modifiedAt}` : "",
        })}
        ${others ? `<div class="ws-list" style="margin-top:16px"><div class="ws-title">More pages</div><ul>${others}</ul></div>` : ""}`,
        markdown: `### ${f.title}\n\n${truncate(f.body, 600)}\n\n---\n\n` +
          sorted.slice(1, 6).map(d => `- **${d.title}** _(${d.modifiedAt ?? ""})_`).join("\n"),
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
