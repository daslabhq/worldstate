/**
 * Message — canonical type for chat/messaging state.
 *
 * Vendor implementations: Slack, Teams, Discord, IRC, WhatsApp.
 */

import { defineAsset } from "../asset.js";
import { defineView, escapeHtml, truncate } from "../view.js";
import { ListView } from "../views/primitives.js";

export interface ChatMessage {
  id:        string;
  channel:   string;
  sender:    string;
  body:      string;
  timestamp?: string;
}

export interface MessageState {
  channels: Array<{ id: string; name: string }>;
  messages: ChatMessage[];
}

function groupByChannel(s: MessageState): Map<string, ChatMessage[]> {
  const m = new Map<string, ChatMessage[]>();
  for (const msg of s.messages) m.set(msg.channel, [...(m.get(msg.channel) ?? []), msg]);
  return m;
}

const ActivityView = defineView<MessageState>({
  name: "MessagingActivity",
  sizes: {
    icon: (s) => {
      const total = s.messages.length;
      return {
        html: `<div class="ws-app-icon"><div class="ws-app-emoji">💬</div><div class="ws-app-name">Chat</div>${total ? `<div class="ws-app-badge">${total}</div>` : ""}</div>`,
        markdown: `💬 Chat · ${total} message${total === 1 ? "" : "s"}`,
      };
    },
    small: (s) => {
      const grouped = groupByChannel(s);
      const top = [...grouped.entries()][0];
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">💬 ${grouped.size} active channel${grouped.size === 1 ? "" : "s"}</div>
          ${top ? `<div class="ws-small-body">
            <div class="ws-small-title">#${escapeHtml(top[0])}</div>
            <div class="ws-small-sub">${top[1].length} message${top[1].length === 1 ? "" : "s"}</div>
          </div>` : ""}
        </div>`,
        markdown: `**Chat** · ${grouped.size} channel${grouped.size === 1 ? "" : "s"} active${top ? `\n_top:_ #${top[0]} (${top[1].length} msgs)` : ""}`,
      };
    },
    medium: (s) => {
      const grouped = groupByChannel(s);
      const items = [...grouped.entries()].map(([ch, msgs]) => {
        const last = msgs[msgs.length - 1];
        return {
          title: `#${ch}`,
          subtitle: `${msgs.length} message${msgs.length === 1 ? "" : "s"}`,
          detail: last ? `${last.sender}: ${truncate(last.body, 110)}` : "",
        };
      });
      return {
        html: ListView.toHTML({ title: "Recent activity", items }),
        markdown: [...grouped.entries()].map(([ch, msgs]) =>
          `**#${ch}** (${msgs.length} messages)\n` +
          msgs.slice(-2).map(m => `> ${m.sender}: ${truncate(m.body, 100)}`).join("\n")
        ).join("\n\n"),
      };
    },
  },
});

export const Message = defineAsset<MessageState>({
  type: "message/channels",
  description: "Canonical messaging — channels + messages.",
  schema: {
    type: "object",
    properties: { channels: { type: "array" }, messages: { type: "array" } },
    required: ["channels", "messages"],
  },
  defaultView: ActivityView,
  mockState: () => ({
    channels: [
      { id: "C-eng", name: "engineering" },
      { id: "C-mkt", name: "marketing"   },
    ],
    messages: [
      { id: "1", channel: "engineering", sender: "alice", body: "Deploy is green; canary at 5%." },
      { id: "2", channel: "engineering", sender: "bob",   body: "Looks good — bumping to 25%."   },
      { id: "3", channel: "marketing",   sender: "carol", body: "Paused c-retain. CPA was high." },
    ],
  }),
});
