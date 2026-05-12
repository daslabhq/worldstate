/**
 * Email — canonical type for inbox/mailbox state.
 *
 * Vendor implementations declare `extends: ["email/mailbox"]`:
 *   Gmail, Outlook, ProtonMail, Fastmail, …
 *
 * Each size returns a WidgetData JSON; the framework converts it to
 * HTML / Markdown / Text. Authors don't write parallel rendering code.
 */

import { defineAsset } from "../asset.js";
import { defineView, truncate } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

export interface EmailMessage {
  id:         string;
  from:       string;
  to:         string[];
  subject:    string;
  body?:      string;
  date?:      string;
  unread?:    boolean;
}

export interface EmailMailboxState {
  messages: EmailMessage[];
}

const unreadCount = (s: EmailMailboxState) => s.messages.filter(m => m.unread).length;

const InboxView = defineView<EmailMailboxState>({
  name: "EmailInbox",
  sizes: {
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.envelope,
      color: "blue",
      label: "Email",
      badge: unreadCount(s) || undefined,
    }),

    small: (s): WidgetData => {
      const u = unreadCount(s);
      const top = s.messages.find(m => m.unread) ?? s.messages[0];
      return {
        type: "stack",
        header: { glyph: ICONS.envelope, color: "blue", title: "Inbox", meta: u ? `${u} unread` : undefined },
        body: top ? [{
          type: "list",
          items: [{
            id: top.id,
            title: truncate(top.subject || "(no subject)", 40),
            subtitle: top.from,
            badge: top.unread ? "unread" : undefined,
          }],
        }] : [{ type: "empty", message: "no messages" }],
      };
    },

    medium: (s): WidgetData => {
      const u = unreadCount(s);
      return {
        type: "stack",
        header: { glyph: ICONS.envelope, color: "blue", title: "Inbox", meta: `${s.messages.length} · ${u} unread` },
        body: [{
          type: "list",
          layout: "grid-2",
          items: s.messages.slice(0, 4).map(m => ({
            id: m.id,
            title: truncate(m.subject || "(no subject)", 32),
            subtitle: m.from,
            badge: m.unread ? "unread" : undefined,
          })),
        }],
      };
    },

    large: (s): WidgetData => {
      const u = unreadCount(s);
      return {
        type: "list",
        title: `Inbox · ${s.messages.length} messages${u ? ` · ${u} unread` : ""}`,
        items: s.messages.slice(0, 8).map(m => ({
          id: m.id,
          title: m.subject || "(no subject)",
          subtitle: m.from,
          detail: truncate(m.body ?? "", 100),
          badge: m.unread ? "unread" : undefined,
        })),
      };
    },

    xlarge: (s): WidgetData => {
      const u = unreadCount(s);
      return {
        type: "list",
        title: `Inbox · ${s.messages.length} messages${u ? ` · ${u} unread` : ""}`,
        items: s.messages.map(m => ({
          id: m.id,
          title: m.subject || "(no subject)",
          subtitle: `${m.from} · ${m.date?.split("T")[0] ?? ""}`,
          detail: m.body ?? "",
          badge: m.unread ? "unread" : undefined,
        })),
      };
    },
  },
});

export const Email = defineAsset<EmailMailboxState>({
  type: "email/mailbox",
  description: "Canonical mailbox — list of email messages.",
  schema: {
    type: "object",
    properties: { messages: { type: "array" } },
    required: ["messages"],
  },
  defaultView: InboxView,
  mockState: () => ({
    messages: [
      { id: "m1",  from: "alice@vendor.com",        to: ["me@x.com"], subject: "Invoice #4421 — overdue",      body: "Hi, just a heads up the invoice for $1,240 is past due. Please confirm payment status — would help me close out the books for the quarter.", unread: true,  date: "2026-04-30T08:14:00Z" },
      { id: "m2",  from: "ceo@company.com",         to: ["me@x.com"], subject: "Quick question about Q2 plan", body: "Got a sec to chat about the launch timeline for the new product? Want to align on the scope before the partner call tomorrow.",            unread: true,  date: "2026-04-30T07:55:00Z" },
      { id: "m3",  from: "alerts@stripe.com",       to: ["me@x.com"], subject: "Payout completed: $1,200",     body: "Your payout of $1,200 has been deposited. Reference id: po_1Q4Bxz.",                                                                       unread: true,  date: "2026-04-30T06:30:00Z" },
      { id: "m4",  from: "jordan@bigco.example",    to: ["me@x.com"], subject: "Re: contract terms",            body: "Thanks for the redlines. Legal will respond by EOW. Two open questions on the SLA section.",                                              unread: true,  date: "2026-04-30T06:02:00Z" },
      { id: "m5",  from: "newsletter@nyt.com",      to: ["me@x.com"], subject: "Morning briefing — Apr 30",     body: "Top stories: markets, climate, an interview with the new EU AI commissioner.",                                                            unread: false, date: "2026-04-30T05:00:00Z" },
      { id: "m6",  from: "bob@team.com",            to: ["me@x.com"], subject: "Re: standup notes",             body: "Adding two things to the agenda: deploy retro + capacity planning for next sprint.",                                                       unread: false, date: "2026-04-29T22:01:00Z" },
      { id: "m7",  from: "calendar-noreply@google", to: ["me@x.com"], subject: "Reminder: Sales review",         body: "Sales review tomorrow at 1 PM. Conf Room 3.",                                                                                              unread: false, date: "2026-04-29T18:30:00Z" },
      { id: "m8",  from: "support@github.com",      to: ["me@x.com"], subject: "[scenecast] PR review",       body: "Alice approved your PR #44. Tests are green; ready to merge.",                                                                             unread: false, date: "2026-04-29T15:18:00Z" },
      { id: "m9",  from: "people@company.com",      to: ["me@x.com"], subject: "Benefits enrollment open",       body: "Open enrollment runs through May 15. Pick your plan options on Workday.",                                                                  unread: false, date: "2026-04-29T11:02:00Z" },
      { id: "m10", from: "linkedin@e.linkedin.com", to: ["me@x.com"], subject: "5 new jobs that match your search", body: "We found 5 new senior engineering roles in your area.",                                                                                  unread: false, date: "2026-04-28T20:45:00Z" },
    ],
  }),
});
