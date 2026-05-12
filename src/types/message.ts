/**
 * Message — canonical type for chat/messaging state.
 *
 * Vendor implementations: Slack, Teams, Discord, IRC, WhatsApp.
 */

import { defineAsset } from "../asset.js";
import { defineView, truncate } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

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
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.chat,
      color: "green",
      label: "Chat",
      badge: s.messages.length || undefined,
    }),

    small: (s): WidgetData => {
      const grouped = groupByChannel(s);
      const top = [...grouped.entries()][0];
      return {
        type: "stack",
        header: { glyph: ICONS.chat, color: "green", title: `${grouped.size} channel${grouped.size === 1 ? "" : "s"} active` },
        body: top ? [{
          type: "list",
          items: [{ title: `#${top[0]}`, subtitle: `${top[1].length} message${top[1].length === 1 ? "" : "s"}` }],
        }] : [{ type: "empty", message: "no messages" }],
      };
    },

    medium: (s): WidgetData => {
      const grouped = groupByChannel(s);
      return {
        type: "stack",
        header: { glyph: ICONS.chat, color: "green", title: "Recent activity", meta: `${grouped.size} channels` },
        body: [{
          type: "list",
          items: [...grouped.entries()].slice(0, 6).map(([ch, msgs]) => {
            const last = msgs[msgs.length - 1];
            return {
              id: ch,
              title: `#${ch}`,
              subtitle: `${msgs.length} message${msgs.length === 1 ? "" : "s"}`,
              detail: last ? `${last.sender}: ${truncate(last.body, 110)}` : "",
            };
          }),
        }],
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
