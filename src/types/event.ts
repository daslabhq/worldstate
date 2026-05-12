/**
 * Event — canonical type for calendar events.
 *
 * Vendor implementations: Google Calendar, Outlook Calendar, Apple Calendar,
 * Calendly, Zoom (scheduled meetings), …
 */

import { defineAsset } from "../asset.js";
import { defineView } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

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
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.calendar,
      color: "red",
      label: "Events",
      badge: s.events.length || undefined,
    }),

    small: (s): WidgetData => {
      const next = nextEvent(s);
      return {
        type: "stack",
        header: { glyph: ICONS.calendar, color: "red", title: "Next up" },
        body: next ? [{
          type: "list",
          items: [{
            id: next.id,
            title: next.title,
            subtitle: `${next.allDay ? "all day" : shortTime(next.startsAt)}${next.location ? ` · ${next.location}` : ""}`,
          }],
        }] : [{ type: "empty", message: "no events" }],
      };
    },

    medium: (s): WidgetData => ({
      type: "stack",
      header: { glyph: ICONS.calendar, color: "red", title: "Upcoming", meta: `${s.events.length} events` },
      body: [{
        type: "calendar",
        events: s.events.slice(0, 4).map(e => ({
          id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt,
          location: e.location, allDay: e.allDay,
        })),
      }],
    }),

    large: (s): WidgetData => ({
      type: "calendar",
      title: "Upcoming",
      events: s.events.map(e => ({
        id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt,
        location: e.location, attendees: e.attendees, allDay: e.allDay,
      })),
    }),
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
