/**
 * Email — canonical type for inbox/mailbox state.
 *
 * Vendor implementations declare `extends: ["email/mailbox"]`:
 *   Gmail, Outlook, ProtonMail, Fastmail, …
 */

import { defineAsset } from "../asset.js";
import { defineView, escapeHtml, truncate } from "../view.js";
import { ListView } from "../views/primitives.js";

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
    icon: (s) => {
      const u = unreadCount(s);
      return {
        html: `<div class="ws-app-icon"><div class="ws-app-emoji">📧</div><div class="ws-app-name">Email</div>${u ? `<div class="ws-app-badge">${u}</div>` : ""}</div>`,
        markdown: `📧 Email${u ? ` · ${u} unread` : ""}`,
      };
    },
    small: (s) => {
      const u = unreadCount(s);
      const top = s.messages.find(m => m.unread) ?? s.messages[0];
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">📧 Inbox <span class="ws-small-num">${u} unread</span></div>
          ${top ? `<div class="ws-small-body">
            <div class="ws-small-title">${escapeHtml(truncate(top.subject || "(no subject)", 40))}</div>
            <div class="ws-small-sub">${escapeHtml(top.from)}</div>
          </div>` : ""}
        </div>`,
        markdown: `**Inbox** · ${u} unread${top ? `\n_latest:_ "${truncate(top.subject || "(no subject)", 60)}" — ${top.from}` : ""}`,
      };
    },
    medium: (s) => {
      const u = unreadCount(s);
      return {
        html: ListView.toHTML({
          title: `Inbox · ${s.messages.length} messages${u ? ` · ${u} unread` : ""}`,
          items: s.messages.slice(0, 6).map(m => ({
            title: m.subject || "(no subject)",
            subtitle: m.from,
            badge: m.unread ? "unread" : undefined,
          })),
        }),
        markdown: ListView.toMarkdown({
          title: `Inbox (${s.messages.length} msgs, ${u} unread)`,
          items: s.messages.slice(0, 6).map(m => ({
            title: m.subject || "(no subject)",
            subtitle: `from ${m.from}${m.unread ? " · unread" : ""}`,
          })),
        }),
      };
    },
    large: (s) => {
      const u = unreadCount(s);
      return {
        html: ListView.toHTML({
          title: `Inbox · ${s.messages.length} messages${u ? ` · ${u} unread` : ""}`,
          items: s.messages.slice(0, 20).map(m => ({
            title: m.subject || "(no subject)",
            subtitle: m.from,
            detail: truncate(m.body ?? "", 140),
            badge: m.unread ? "unread" : undefined,
          })),
        }),
        markdown: ListView.toMarkdown({
          title: `Inbox (${s.messages.length} msgs, ${u} unread)`,
          items: s.messages.slice(0, 20).map(m => ({
            title: m.subject || "(no subject)",
            subtitle: `from ${m.from}${m.unread ? " · unread" : ""}`,
          })),
        }),
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
      { id: "m1", from: "alice@vendor.com",   to: ["me@x.com"], subject: "Invoice — overdue",        body: "Past due, please confirm.",            unread: true,  date: "2026-04-30T08:14:00Z" },
      { id: "m2", from: "ceo@company.com",    to: ["me@x.com"], subject: "Quick question",            body: "Got a sec?",                            unread: true,  date: "2026-04-30T07:55:00Z" },
      { id: "m3", from: "alerts@stripe.com",  to: ["me@x.com"], subject: "Payout completed: $1,200",  body: "Your payout has been deposited.",       unread: false, date: "2026-04-30T06:30:00Z" },
      { id: "m4", from: "newsletter@nyt.com", to: ["me@x.com"], subject: "Morning briefing",          body: "Top stories…",                          unread: false, date: "2026-04-30T05:00:00Z" },
    ],
  }),
});
