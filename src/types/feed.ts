/**
 * Feed — canonical type for time-ordered streams of source-attributed items.
 *
 * Vendor implementations: Techmeme, Hacker News, paperswithcode, arxiv-sanity,
 * RSS readers, AlphaSignal, …
 *
 * Items sharing `cluster_id` are the same event covered by multiple sources —
 * this is techmeme's "+N more sources covered this" pattern, expressed flat.
 * Renderers group by cluster_id for the lead-headline-plus-secondaries view.
 */

import { defineAsset } from "../asset.js";
import { defineView, truncate } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

export interface FeedItem {
  id:            string;
  title:         string;
  url:           string;

  /**
   * The publishing entity — a brand, publication, or account.
   *   blog post     → "Anthropic"
   *   X / Twitter   → "@some_handle"     (the handle IS the entity)
   *   Hacker News   → "Hacker News"
   *   GitHub release→ "owner/repo"
   *   newsletter    → "The Sequence"
   *   leaderboard   → "ARC Prize"
   */
  source:        string;
  source_url?:   string;

  /**
   * The medium / platform. Distinct from `source`.
   * Renderers split items into two groups:
   *   - news coverage (blog/newspaper/leaderboard/paper/newsletter/github/podcast/video)
   *   - social commentary (twitter/bluesky/linkedin/mastodon/threads)
   * News items render as a compact "+N outlets" line; commentary renders
   * as platform-grouped bodies (Techmeme's X: / Bluesky: / LinkedIn: pattern).
   */
  source_kind?:  "blog" | "newspaper" | "twitter" | "bluesky" | "linkedin" | "mastodon" | "threads" | "github" | "paper" | "newsletter" | "leaderboard" | "podcast" | "video" | "other";

  /**
   * The person who wrote it. Optional. For X posts, leave empty — the
   * handle is already the source. For HN / newsletter / blog posts, the
   * author is distinct from the publication: source="The Sequence", author="J. Editor".
   */
  author?:       string;

  excerpt?:      string;
  thumbnail?:    string;
  published_at?: string;          // ISO 8601

  /** Items sharing cluster_id are the same event from different sources. */
  cluster_id?:   string;

  /** 0-100. Lead headline of a cluster gets the highest importance. */
  importance?:   number;

  /** Editorial signals — surface as badges in render. */
  is_sota?:      boolean;
  is_release?:   boolean;
  score?:        number;          // e.g. 18.2 for "scored 18.2%"
  score_metric?: string;          // "task_pass" / "accuracy" / etc.
  score_target?: string;          // "arc-agi-2" — what the score is on

  /** Tagged mentions. Flat list — typed entities can be looked up by id. */
  mentions?:     string[];        // ["arc-agi-2", "gpt-5", "anthropic", "ttt"]
}

export interface FeedState {
  items:        FeedItem[];
  fetched_at?:  string;
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------*/

/** Social-commentary source kinds — items render as platform-grouped bodies. */
const SOCIAL_KINDS = new Set(["twitter", "bluesky", "linkedin", "mastodon", "threads"]);

function isSocial(it: FeedItem): boolean {
  return it.source_kind != null && SOCIAL_KINDS.has(it.source_kind);
}

interface Cluster {
  lead:        FeedItem;
  /** Other publications covering the same story (techmeme's "More:"). */
  coverage:    FeedItem[];
  /** Commentary grouped by social platform (techmeme's "X:" / "Bluesky:" / etc.). */
  commentary:  Map<string, FeedItem[]>;
}

const clusters = (s: FeedState): Cluster[] => {
  const groups = new Map<string, FeedItem[]>();
  const singles: FeedItem[] = [];
  for (const it of s.items) {
    if (it.cluster_id) {
      const arr = groups.get(it.cluster_id) ?? [];
      arr.push(it);
      groups.set(it.cluster_id, arr);
    } else {
      singles.push(it);
    }
  }
  const out: Cluster[] = [];
  for (const arr of groups.values()) {
    const lead = arr.reduce((a, b) => (a.importance ?? 0) >= (b.importance ?? 0) ? a : b);
    const rest = arr.filter(it => it !== lead);
    const coverage = rest.filter(it => !isSocial(it));
    const commentary = new Map<string, FeedItem[]>();
    for (const it of rest.filter(isSocial)) {
      const key = it.source_kind!;
      const list = commentary.get(key) ?? [];
      list.push(it);
      commentary.set(key, list);
    }
    out.push({ lead, coverage, commentary });
  }
  for (const it of singles) out.push({ lead: it, coverage: [], commentary: new Map() });
  return out.sort((a, b) => (b.lead.importance ?? 0) - (a.lead.importance ?? 0));
};

const sotaCount = (s: FeedState): number => s.items.filter(it => it.is_sota).length;

/** Total commentary across all platforms for a cluster. */
function commentaryTotal(c: Cluster): number {
  let n = 0;
  for (const arr of c.commentary.values()) n += arr.length;
  return n;
}

/** Score metrics that render with a % sign. Everything else is a count/value. */
const PERCENT_METRICS = new Set(["accuracy", "task_pass", "equivalence", "percentage", "pct"]);

/** Compact subtitle for list views — preserves the score/SOTA badges. */
const itemSubtitle = (c: Cluster): string => {
  const parts: string[] = [c.lead.source];
  const cov = c.coverage.length;
  const com = commentaryTotal(c);
  if (cov > 0) parts.push(`+${cov} more`);
  if (com > 0) parts.push(`${com} reactions`);
  if (c.lead.score != null && c.lead.score_target) {
    const pct = c.lead.score_metric && PERCENT_METRICS.has(c.lead.score_metric);
    parts.push(`${c.lead.score}${pct ? "%" : ""} ${c.lead.score_target}`);
  }
  if (c.lead.is_sota) parts.push("SOTA");
  return parts.join(" · ");
};

/** Platform display labels for commentary groups. */
const PLATFORM_LABEL: Record<string, string> = {
  twitter:  "X",
  bluesky:  "Bluesky",
  linkedin: "LinkedIn",
  mastodon: "Mastodon",
  threads:  "Threads",
};

/* ---------------------------------------------------------------------------
 * Views
 * ------------------------------------------------------------------------*/

const FeedView = defineView<FeedState>({
  name: "Feed",
  sizes: {
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.newspaper,
      color: "indigo",
      label: "Feed",
      badge: clusters(s).length || undefined,
    }),

    small: (s): WidgetData => {
      const cs = clusters(s);
      const top = cs[0];
      const sotas = sotaCount(s);
      return {
        type: "stack",
        header: {
          glyph: ICONS.newspaper,
          color: "indigo",
          title: "Latest",
          meta: sotas ? `${sotas} SOTA` : `${cs.length} stories`,
        },
        body: top ? [{
          type: "list",
          items: [{
            id: top.lead.id,
            title: truncate(top.lead.title, 60),
            subtitle: itemSubtitle(top),
          }],
        }] : [{ type: "empty", message: "no stories" }],
      };
    },

    medium: (s): WidgetData => {
      const cs = clusters(s).slice(0, 4);
      return {
        type: "stack",
        header: {
          glyph: ICONS.newspaper,
          color: "indigo",
          title: "Latest",
          meta: `${clusters(s).length} stories`,
        },
        body: [{
          type: "list",
          items: cs.map(c => ({
            id: c.lead.id,
            title: truncate(c.lead.title, 80),
            subtitle: itemSubtitle(c),
          })),
        }],
      };
    },

    large: (s): WidgetData => {
      // Techmeme-style story render: lead headline + "More:" coverage + commentary per platform.
      // Each cluster becomes its own list block; commentary surfaces with body text.
      const blocks: any[] = [];
      for (const c of clusters(s)) {
        // Lead headline
        blocks.push({
          type: "list",
          title: `${c.lead.author ? c.lead.author + " / " : ""}${c.lead.source}`,
          items: [{
            id: c.lead.id,
            title: c.lead.title,
            subtitle: c.lead.excerpt ?? itemSubtitle(c),
          }],
        });
        // "More:" — compact list of news outlets
        if (c.coverage.length > 0) {
          blocks.push({
            type: "list",
            title: "More",
            items: c.coverage.map(it => ({
              id: it.id,
              title: it.title,
              subtitle: `${it.author ? it.author + " · " : ""}${it.source}`,
            })),
          });
        }
        // Commentary groups: "X:", "Bluesky:", etc. — body text per author
        for (const [kind, items] of c.commentary) {
          blocks.push({
            type: "list",
            title: PLATFORM_LABEL[kind] ?? kind,
            items: items.map(it => ({
              id: it.id,
              title: it.source,           // the handle / display name
              subtitle: it.title,         // the post body
            })),
          });
        }
      }
      return {
        type: "stack",
        header: {
          glyph: ICONS.newspaper,
          color: "indigo",
          title: "Feed",
          meta: s.fetched_at,
        },
        body: blocks,
      };
    },
  },
});

/* ---------------------------------------------------------------------------
 * Canonical asset
 * ------------------------------------------------------------------------*/

export const Feed = defineAsset<FeedState>({
  type: "feed/social",
  description:
    "Canonical Feed — time-ordered stream of source-attributed items. " +
    "Items sharing cluster_id are the same event from different sources " +
    "(techmeme's lead-headline-plus-secondaries pattern, flat).",
  schema: {
    type: "object",
    properties: { items: { type: "array" } },
    required: ["items"],
  },
  defaultView: FeedView,
  mockState: (): FeedState => ({
    fetched_at: "2026-05-10T09:00:00Z",
    items: [
      // ─── Cluster c1: a hypothetical AI funding story — full techmeme shape:
      // lead headline → News coverage ("More:") → commentary across X / Bluesky / LinkedIn.
      // All sources, authors, and commentary handles below are FICTIONAL.
      { id: "i1", cluster_id: "c1", importance: 90,
        source: "Example Daily", source_kind: "newspaper",
        url: "https://example.com/news/...",
        title: "Acme AI raises $500M Series C at $5B valuation, led by Atlas Capital",
        excerpt: "The round, led by Atlas Capital with participation from existing investors, brings total funding to $750M. Acme AI plans to expand its inference infrastructure.",
        published_at: "2026-05-10T07:30:00Z",
        is_release: true,
        mentions: ["acme-ai", "atlas-capital"] },

      // "More:" — other outlets covering the same story.
      { id: "i2", cluster_id: "c1", importance: 55,
        source: "Example Tech", source_kind: "blog",
        url: "https://example.com/tech/...",
        title: "Acme AI closes Series C, eyeing $5B valuation" },
      { id: "i3", cluster_id: "c1", importance: 52,
        source: "Example Wire", source_kind: "newspaper",
        url: "https://example.com/wire/...",
        title: "Atlas Capital Leads $500M Round in Acme AI" },
      { id: "i4", cluster_id: "c1", importance: 48,
        source: "Hacker News", source_kind: "blog",
        url: "https://news.ycombinator.com/item?id=...",
        title: "Acme AI raises $500M Series C (example.com)" },
      { id: "i5", cluster_id: "c1", importance: 45,
        source: "Example Newsletter", source_kind: "newsletter",
        url: "https://example.com/newsletter/...",
        title: "Inside Acme AI's Series C: The Cap Table That Took Shape" },

      // X commentary — full body text per author. Handles are fictional.
      { id: "i6", cluster_id: "c1", importance: 42,
        source: "@ai_capital", source_kind: "twitter",
        url: "https://x.com/ai_capital/status/...",
        title: "Acme AI at $5B is the cleanest pure-play AI capital story of the year. Most of the rest is bundled into bigger platform bets." },
      { id: "i7", cluster_id: "c1", importance: 38,
        source: "@enterprise_signal", source_kind: "twitter",
        url: "https://x.com/enterprise_signal/status/...",
        title: "Worth noting: Atlas Capital leading a Series C is a different signal than a growth fund. Enterprise channel suddenly matters in a way it didn't 12 months ago." },
      { id: "i8", cluster_id: "c1", importance: 34,
        source: "@ai_economist", source_kind: "twitter",
        url: "https://x.com/ai_economist/status/...",
        title: "Valuation reflects narrative, not revenue. The interesting number is unit economics on API calls — which nobody's publishing." },

      // Bluesky commentary — different platform, same shape.
      { id: "i9", cluster_id: "c1", importance: 30,
        source: "@ml_curious.bsky.social", source_kind: "bluesky",
        url: "https://bsky.app/profile/ml_curious.bsky.social/post/...",
        title: "Curious whether the round was raised primarily to fund inference compute or to fund a training run bigger than anyone has run." },

      // LinkedIn commentary — typically longer, more professional voice.
      { id: "i10", cluster_id: "c1", importance: 28,
        source: "A. Investor", source_kind: "linkedin",
        url: "https://linkedin.com/feed/update/...",
        title: "Notable that this round was led by a tier-one fund rather than a corporate strategic. That structure is becoming the default for late-stage AI rounds — the deep pockets and distribution channels matter more than the financing mechanics at this scale." },

      // ─── Cluster c2: a hypothetical research milestone with a benchmark score.
      { id: "i11", cluster_id: "c2", importance: 75,
        source: "Example Research Lab", source_kind: "blog",
        url: "https://example.com/research/...",
        title: "ProofBot and GeoSolver 2 solve advanced math problems at silver-medal level",
        excerpt: "Combining symbolic search with neural reasoning, the system solves 4 of 6 olympiad problems in under three days — first system to reach silver-medal performance on this benchmark.",
        published_at: "2026-05-09T14:00:00Z",
        is_sota: true,
        score: 4, score_metric: "problems_solved", score_target: "math-olympiad-2024",
        mentions: ["example-lab", "proofbot", "math-olympiad-2024"] },
      { id: "i12", cluster_id: "c2", importance: 48,
        source: "Example Journal", source_kind: "paper",
        author: "R. Researcher et al.",
        url: "https://example.com/journal/...",
        title: "Hybrid symbolic-neural system reaches silver-medal performance on math olympiad benchmark" },
      { id: "i13", cluster_id: "c2", importance: 40,
        source: "@example_lab", source_kind: "twitter",
        url: "https://x.com/example_lab/status/...",
        title: "ProofBot + GeoSolver 2 just reached silver-medal level — solving 4 out of 6 problems. Combining symbolic search with neural reasoning is the unlock." },
      { id: "i14", cluster_id: "c2", importance: 32,
        source: "@lean_prover", source_kind: "twitter",
        url: "https://x.com/lean_prover/status/...",
        title: "What's interesting in the ProofBot result isn't the score — it's that the model is searching over a formal language where verification is free. That's the part transferring to other domains is hard." },

      // ─── Cluster c3: a smaller unclustered HN-only story (demonstrates singletons).
      { id: "i15", importance: 25,
        source: "Hacker News", source_kind: "blog",
        author: "anon_hacker",
        url: "https://news.ycombinator.com/item?id=...",
        title: "Show HN: A tiny Lisp implementation in 500 lines of Rust" },
    ],
  }),
});
