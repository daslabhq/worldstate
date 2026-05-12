/**
 * Task — canonical type for work items / tickets / todos.
 *
 * Vendor implementations: Jira, Linear, Asana, Notion, Trello, GitHub Issues,
 * Things, OmniFocus, …
 */

import { defineAsset } from "../asset.js";
import { defineView } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

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
    icon: (s): WidgetData => {
      const c = counts(s);
      return {
        type: "icon",
        glyph: ICONS.checkCircle,
        color: "orange",
        label: "Tasks",
        badge: (c.todo + c.in_progress) || undefined,
      };
    },

    small: (s): WidgetData => {
      const c = counts(s);
      return {
        type: "stack",
        header: { glyph: ICONS.checkCircle, color: "orange", title: "Tasks" },
        body: [{
          type: "list",
          items: [{
            title: `${c.in_progress} in progress · ${c.done} done`,
            subtitle: c.blocked ? `⚠️ ${c.blocked} blocked` : `${c.todo} to do`,
          }],
        }],
      };
    },

    medium: (s): WidgetData => {
      const c = counts(s);
      return {
        type: "stack",
        header: { glyph: ICONS.checkCircle, color: "orange", title: "Sprint board" },
        body: [
          { type: "metric_grid", metrics: [
            { type: "metric", id: "in_progress", value: c.in_progress, label: "In progress" },
            { type: "metric", id: "done",        value: c.done,        label: "Done" },
            { type: "metric", id: "blocked",     value: c.blocked,     label: "Blocked",
              trend: c.blocked > 0 ? "down" : "flat" },
          ]},
          { type: "table",
            columns: ["Title", "Status", "Assignee"],
            rows: s.tasks.slice(0, 4).map(t => ({
              Title: t.title, Status: t.status, Assignee: t.assignee ?? "—",
            })),
          },
        ],
      };
    },

    large: (s): WidgetData => {
      const c = counts(s);
      return {
        type: "stack",
        header: { glyph: ICONS.checkCircle, color: "orange", title: "Sprint board" },
        body: [
          { type: "metric_grid", metrics: [
            { type: "metric", id: "in_progress", value: c.in_progress, label: "In progress" },
            { type: "metric", id: "done",        value: c.done,        label: "Done" },
            { type: "metric", id: "blocked",     value: c.blocked,     label: "Blocked",
              trend: c.blocked > 0 ? "down" : "flat" },
          ]},
          { type: "table",
            title: "Tasks",
            columns: ["Title", "Status", "Assignee", "Priority"],
            rows: s.tasks.map(t => ({
              Title: t.title, Status: t.status,
              Assignee: t.assignee ?? "—", Priority: t.priority ?? "—",
            })),
          },
        ],
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
      { id: "t1", title: "Implement OAuth2 PKCE flow for mobile clients", status: "done",        assignee: "alice", priority: "high" },
      { id: "t2", title: "Migrate user table to UUID primary keys",       status: "in_progress", assignee: "bob",   priority: "high" },
      { id: "t3", title: "Add rate limiting to public API endpoints",     status: "todo",        assignee: "alice", priority: "medium" },
      { id: "t4", title: "Investigate race condition in payment webhook", status: "blocked",     assignee: "carol", priority: "medium" },
    ],
  }),
});
