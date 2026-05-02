/**
 * Event — canonical type for calendar events.
 *
 * Vendor implementations: Google Calendar, Outlook Calendar, Apple Calendar,
 * Calendly, Zoom (scheduled meetings), …
 */

import { defineAsset } from "../asset.js";
import { CalendarView, type CalendarProps } from "../views/primitives.js";
import { defineView, escapeHtml } from "../view.js";

export interface CalendarEventRecord {
  id:         string;
  title:      string;
  startsAt:   string;
  endsAt?:    string;
  location?:  string;
  attendees?: string[];
  allDay?:    boolean;
}

export interface CalendarEventsState {
  events: CalendarEventRecord[];
}

function nextEvent(s: CalendarEventsState): CalendarEventRecord | undefined {
  const now = Date.now();
  return [...s.events]
    .filter(e => new Date(e.startsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    ?? s.events[0];
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const UpcomingView = defineView<CalendarEventsState>({
  name: "UpcomingEvents",
  sizes: {
    icon: (s) => ({
      html: `<div class="ws-app-icon"><div class="ws-app-emoji">📅</div><div class="ws-app-name">Events</div>${s.events.length ? `<div class="ws-app-badge">${s.events.length}</div>` : ""}</div>`,
      markdown: `📅 Events · ${s.events.length} upcoming`,
    }),
    small: (s) => {
      const next = nextEvent(s);
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">📅 Next up</div>
          ${next ? `<div class="ws-small-body">
            <div class="ws-small-title">${escapeHtml(next.title)}</div>
            <div class="ws-small-sub">${escapeHtml(next.allDay ? "all day" : shortTime(next.startsAt))}${next.location ? ` · ${escapeHtml(next.location)}` : ""}</div>
          </div>` : `<div class="ws-empty">no events</div>`}
        </div>`,
        markdown: next
          ? `**Next event** — ${shortTime(next.startsAt)} · **${next.title}**${next.location ? ` (${next.location})` : ""}`
          : "**No upcoming events**",
      };
    },
    medium: (s) => {
      const props: CalendarProps = {
        title: "Upcoming",
        events: s.events.slice(0, 4).map(e => ({
          title: e.title, start: e.startsAt, end: e.endsAt,
          location: e.location, allDay: e.allDay,
        })),
      };
      return {
        html: CalendarView.toHTML(props),
        markdown: CalendarView.toMarkdown(props),
      };
    },
    large: (s) => {
      const props: CalendarProps = {
        title: "Upcoming",
        events: s.events.map(e => ({
          title: e.title, start: e.startsAt, end: e.endsAt,
          location: e.location, attendees: e.attendees, allDay: e.allDay,
        })),
      };
      return {
        html: CalendarView.toHTML(props),
        markdown: CalendarView.toMarkdown(props),
      };
    },
  },
});

export const Event = defineAsset<CalendarEventsState>({
  type: "event/calendar",
  description: "Canonical calendar events — what's scheduled.",
  schema: {
    type: "object",
    properties: { events: { type: "array" } },
    required: ["events"],
  },
  defaultView: UpcomingView,
  mockState: () => ({
    events: [
      { id: "e1", title: "Daily standup",       startsAt: "2026-05-02T10:00:00", endsAt: "2026-05-02T10:15:00", attendees: ["alice@team", "bob@team"] },
      { id: "e2", title: "Sales review · Q2",   startsAt: "2026-05-02T13:00:00", endsAt: "2026-05-02T14:00:00", location: "Conf Room 3" },
      { id: "e3", title: "Customer call",       startsAt: "2026-05-02T15:30:00", endsAt: "2026-05-02T16:00:00", location: "Zoom" },
      { id: "e4", title: "Off-site",            startsAt: "2026-05-04",          allDay: true },
    ],
  }),
});
