/**
 * Task — canonical type for work items / tickets / todos.
 *
 * Vendor implementations: Jira, Linear, Asana, Notion, Trello, GitHub Issues,
 * Things, OmniFocus, …
 */

import { defineAsset } from "../asset.js";
import { defineView, escapeHtml } from "../view.js";
import { TableView, MetricView } from "../views/primitives.js";

export interface TaskRecord {
  id:         string;
  title:      string;
  status:     "todo" | "in_progress" | "review" | "done" | "blocked";
  assignee?:  string;
  dueDate?:   string;
  priority?:  "low" | "medium" | "high" | "urgent";
}

export interface TasksState {
  tasks: TaskRecord[];
}

function counts(s: TasksState) {
  return {
    todo:        s.tasks.filter(t => t.status === "todo").length,
    in_progress: s.tasks.filter(t => t.status === "in_progress").length,
    done:        s.tasks.filter(t => t.status === "done").length,
    blocked:     s.tasks.filter(t => t.status === "blocked").length,
  };
}

const TaskBoardView = defineView<TasksState>({
  name: "TaskBoard",
  sizes: {
    icon: (s) => {
      const c = counts(s);
      const open = c.todo + c.in_progress;
      return {
        html: `<div class="ws-app-icon"><div class="ws-app-emoji">✓</div><div class="ws-app-name">Tasks</div>${open ? `<div class="ws-app-badge">${open}</div>` : ""}</div>`,
        markdown: `✓ Tasks · ${open} open`,
      };
    },
    small: (s) => {
      const c = counts(s);
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">✓ Tasks</div>
          <div class="ws-small-body">
            <div class="ws-small-title">${c.in_progress} in progress · ${c.done} done</div>
            ${c.blocked ? `<div class="ws-small-sub" style="color:var(--red,#ef4444)">${c.blocked} blocked</div>` : `<div class="ws-small-sub">${c.todo} to do</div>`}
          </div>
        </div>`,
        markdown: `**Tasks** · ${c.in_progress} in progress · ${c.done} done${c.blocked ? ` · ⚠️ ${c.blocked} blocked` : ""}`,
      };
    },
    medium: (s) => {
      const c = counts(s);
      return {
        html: `<div class="ws-grid-3">
          ${MetricView.toHTML({ value: c.in_progress, label: "In progress" })}
          ${MetricView.toHTML({ value: c.done,        label: "Done" })}
          ${MetricView.toHTML({ value: c.blocked,     label: "Blocked", trend: c.blocked > 0 ? "down" : "flat" })}
        </div>
        ${TableView.toHTML({
          rows: s.tasks.slice(0, 4).map(t => ({
            Title: t.title, Status: t.status, Assignee: t.assignee ?? "—",
          })),
        })}`,
        markdown: TableView.toMarkdown({
          title: "Tasks",
          rows: s.tasks.slice(0, 6).map(t => ({ Title: t.title, Status: t.status, Assignee: t.assignee ?? "—" })),
        }),
      };
    },
    large: (s) => {
      const c = counts(s);
      return {
        html: `<div class="ws-grid-3">
          ${MetricView.toHTML({ value: c.in_progress, label: "In progress" })}
          ${MetricView.toHTML({ value: c.done,        label: "Done" })}
          ${MetricView.toHTML({ value: c.blocked,     label: "Blocked", trend: c.blocked > 0 ? "down" : "flat" })}
        </div>
        ${TableView.toHTML({
          title: "Tasks",
          columns: ["Title", "Status", "Assignee", "Priority"],
          rows: s.tasks.map(t => ({
            Title: t.title, Status: t.status,
            Assignee: t.assignee ?? "—", Priority: t.priority ?? "—",
          })),
        })}`,
        markdown: TableView.toMarkdown({
          title: "Tasks",
          rows: s.tasks.map(t => ({ Title: t.title, Status: t.status, Assignee: t.assignee ?? "—" })),
        }),
      };
    },
  },
});

export const Task = defineAsset<TasksState>({
  type: "task/list",
  description: "Canonical task list — work items with status + assignee.",
  schema: {
    type: "object",
    properties: { tasks: { type: "array" } },
    required: ["tasks"],
  },
  defaultView: TaskBoardView,
  mockState: () => ({
    tasks: [
      { id: "t1", title: "Wire up scene-bench AB adapter",          status: "done",        assignee: "alice", priority: "high" },
      { id: "t2", title: "Add canonical types to scene-state",      status: "in_progress", assignee: "bob",   priority: "high" },
      { id: "t3", title: "Land daslab.dev/labs page",               status: "todo",        assignee: "alice", priority: "medium" },
      { id: "t4", title: "iOS scene viewer: image card aspect bug", status: "blocked",     assignee: "carol", priority: "medium" },
    ],
  }),
});
