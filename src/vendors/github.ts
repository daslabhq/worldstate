/**
 * GitHub — repos, PRs, issues, CI.
 */

import { defineAsset } from "../asset.js";
import { defineView } from "../view.js";
import { ListView, MetricView } from "../views/primitives.js";

export interface PullRequest {
  number: number;
  title:  string;
  state:  "open" | "merged" | "closed";
  author: string;
  reviewers?: string[];
  ci?:    "passing" | "failing" | "pending";
  draft?: boolean;
}

export interface Issue {
  number: number;
  title:  string;
  state:  "open" | "closed";
  author: string;
  labels: string[];
}

export interface GitHubState {
  repo:   string;
  pulls:  PullRequest[];
  issues: Issue[];
}

const RepoView = defineView<GitHubState>({
  name: "GitHubRepo",
  toHTML(s) {
    const openPulls = s.pulls.filter(p => p.state === "open");
    const failing   = s.pulls.filter(p => p.ci === "failing").length;
    const review    = openPulls.filter(p => !p.draft && p.ci !== "failing").length;
    return `<div class="ws-grid-3">
      ${MetricView.toHTML({ value: openPulls.length, label: "Open PRs" })}
      ${MetricView.toHTML({ value: review,           label: "Awaiting review" })}
      ${MetricView.toHTML({ value: failing,          label: "Failing CI",
                            trend: failing > 0 ? "down" : "flat" })}
    </div>
    ${ListView.toHTML({
      title: `${s.repo} · open PRs`,
      items: openPulls.map(p => ({
        title:    `#${p.number} · ${p.title}`,
        subtitle: `${p.author}${p.draft ? " · draft" : ""}${p.reviewers?.length ? ` · review: ${p.reviewers.join(", ")}` : ""}`,
        badge:    p.ci === "failing" ? "CI ✗" : p.ci === "passing" ? "CI ✓" : p.ci === "pending" ? "CI …" : undefined,
      })),
    })}`;
  },
  toMarkdown(s) {
    const openPulls = s.pulls.filter(p => p.state === "open");
    return ListView.toMarkdown({
      title: `${s.repo} · ${openPulls.length} open PRs`,
      items: openPulls.map(p => ({ title: `#${p.number} ${p.title}`, subtitle: `by ${p.author}` })),
    });
  },
});

export const GitHub = defineAsset<GitHubState>({
  type: "github/repository",
  extends: ["task/list"],
  description: "GitHub — repo, PRs, issues, CI.",
  schema: { type: "object" },
  defaultView: RepoView,
  secretFields: ["token"],
  mockState: () => ({
    repo: "daslabhq/scene-otel",
    pulls: [
      { number: 12, title: "Add scene.intent + amber rendering", state: "open", author: "alice", reviewers: ["bob"], ci: "passing"  },
      { number: 11, title: "Worldstate v0.1 scaffold",           state: "open", author: "carol",                     ci: "pending"  },
      { number: 10, title: "Fix scrubber slider on Safari",      state: "open", author: "dave",  reviewers: ["alice"], ci: "failing"  },
      { number:  9, title: "AutomationBench instrumentation",    state: "open", author: "alice", draft: true,         ci: "passing"  },
      { number:  8, title: "v0.0.3 release notes",               state: "merged", author: "alice" },
    ],
    issues: [
      { number: 21, title: "Pages deploy occasionally caches", state: "open",  author: "carol", labels: ["bug", "infra"]   },
      { number: 20, title: "Clarify wire-format docs",         state: "open",  author: "dave",  labels: ["docs"]            },
      { number: 19, title: "Image card aspect ratio off",      state: "closed", author: "alice", labels: ["bug", "ui"]      },
    ],
  }),
});
