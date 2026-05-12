import { test, expect, describe } from "bun:test";
import { Feed, type FeedState } from "./feed.js";

const mock = (Feed as any).mockState() as FeedState;
const view = (Feed as any).defaultView;

describe("Feed canonical type", () => {
  test("type registration", () => {
    expect((Feed as any).type).toBe("feed/social");
  });

  test("flat record shape — one type, like Email/Task/Event", () => {
    const item = mock.items[0]!;
    expect(item.id).toBeString();
    expect(item.source).toBeString();
    expect(item.title).toBeString();
    expect(item.url).toBeString();
  });

  test("clustering via cluster_id (techmeme's '+N more' flat)", () => {
    const cluster = mock.items.filter(it => it.cluster_id === "c1");
    expect(cluster.length).toBeGreaterThan(1);
    const lead = cluster.find(it => it.is_release);
    expect(lead).toBeDefined();
  });

  test("mentions flat list — no nested entities object", () => {
    const release = mock.items.find(it => it.is_release)!;
    expect(release.mentions?.length).toBeGreaterThan(0);
  });

  test("icon view shows cluster + singleton count", () => {
    const out = view.toJSON(mock, { size: "icon" });
    expect(out.type).toBe("icon");
    // 2 clusters (c1, c2) + 1 unclustered item (c3) = 3 stories
    expect(out.badge).toBe(3);
  });

  test("small markdown surfaces lead headline", () => {
    const md = view.toMarkdown(mock, { size: "small" });
    expect(md).toContain("Acme AI");
  });

  test("medium markdown shows +N more for news coverage", () => {
    const md = view.toMarkdown(mock, { size: "medium" });
    // c1 has 1 lead + 4 news items + 3 X + 1 Bluesky + 1 LinkedIn → "+4 more" for coverage
    expect(md).toMatch(/\+4 more/);
  });

  test("medium markdown shows reaction count for social commentary", () => {
    const md = view.toMarkdown(mock, { size: "medium" });
    // c1 has 3 X + 1 Bluesky + 1 LinkedIn = 5 reactions
    expect(md).toMatch(/5 reactions/);
  });

  test("score renders as N target", () => {
    const md = view.toMarkdown(mock, { size: "medium" });
    expect(md).toContain("4 math-olympiad-2024");
  });

  test("x post has source = handle, source_kind = twitter, no author", () => {
    const xPost = mock.items.find(it => it.source_kind === "twitter")!;
    expect(xPost.source).toMatch(/^@/);
    expect(xPost.author).toBeUndefined();
  });

  test("large render splits news (More:) from commentary (X / Bluesky / LinkedIn) per techmemer", () => {
    const md = view.toMarkdown(mock, { size: "large" });
    // Lead block named after the source
    expect(md).toContain("Example Daily");
    // "More:" section heading for news coverage
    expect(md).toContain("More");
    // Platform-grouped commentary
    expect(md).toContain("X");
    expect(md).toContain("Bluesky");
    expect(md).toContain("LinkedIn");
    // Body text from commentary surfaces (not just names)
    expect(md).toContain("pure-play AI capital");      // from @ai_capital
    expect(md).toContain("Enterprise channel");         // from @enterprise_signal
    expect(md).toContain("Notable that this round");    // from A. Investor on LinkedIn
  });

  test("social source_kinds expanded — twitter / bluesky / linkedin all present in mock", () => {
    const kinds = new Set(mock.items.map(it => it.source_kind));
    expect(kinds.has("twitter")).toBe(true);
    expect(kinds.has("bluesky")).toBe(true);
    expect(kinds.has("linkedin")).toBe(true);
  });
});
