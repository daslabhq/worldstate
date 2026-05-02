/**
 * Contact — canonical type for people / contact records.
 *
 * Vendor implementations: Salesforce, HubSpot, Airtable, Pipedrive,
 * Notion, Google Contacts, …
 */

import { defineAsset } from "../asset.js";
import { defineView, escapeHtml } from "../view.js";
import { TableView } from "../views/primitives.js";

export interface ContactRecord {
  id:        string;
  firstName: string;
  lastName:  string;
  email?:    string;
  phone?:    string;
  title?:    string;
  company?:  string;
}

export interface ContactsState {
  contacts: ContactRecord[];
}

const ContactListView = defineView<ContactsState>({
  name: "ContactList",
  sizes: {
    icon: (s) => ({
      html: `<div class="ws-app-icon"><div class="ws-app-emoji">👤</div><div class="ws-app-name">Contacts</div>${s.contacts.length ? `<div class="ws-app-badge">${s.contacts.length}</div>` : ""}</div>`,
      markdown: `👤 Contacts · ${s.contacts.length}`,
    }),
    small: (s) => {
      const top = s.contacts[0];
      return {
        html: `<div class="ws-small">
          <div class="ws-small-head">👤 ${s.contacts.length} contacts</div>
          ${top ? `<div class="ws-small-body">
            <div class="ws-small-title">${escapeHtml(top.firstName + " " + top.lastName)}</div>
            <div class="ws-small-sub">${escapeHtml(top.title ?? top.company ?? top.email ?? "")}</div>
          </div>` : ""}
        </div>`,
        markdown: `**Contacts** · ${s.contacts.length}${top ? `\n_first:_ ${top.firstName} ${top.lastName}${top.title ? ` (${top.title})` : ""}` : ""}`,
      };
    },
    medium: (s) => ({
      html: TableView.toHTML({
        title: `${s.contacts.length} contacts`,
        columns: ["Name", "Email", "Title"],
        rows: s.contacts.slice(0, 5).map(c => ({
          Name:  `${c.firstName} ${c.lastName}`,
          Email: c.email ?? "",
          Title: c.title ?? "",
        })),
      }),
      markdown: TableView.toMarkdown({
        title: "Contacts",
        rows: s.contacts.slice(0, 5).map(c => ({
          Name:  `${c.firstName} ${c.lastName}`,
          Title: c.title ?? "",
          Email: c.email ?? "",
        })),
      }),
    }),
    large: (s) => ({
      html: TableView.toHTML({
        title: `${s.contacts.length} contacts`,
        columns: ["Name", "Email", "Phone", "Title", "Company"],
        rows: s.contacts.map(c => ({
          Name:    `${c.firstName} ${c.lastName}`,
          Email:   c.email ?? "",
          Phone:   c.phone ?? "",
          Title:   c.title ?? "",
          Company: c.company ?? "",
        })),
      }),
      markdown: TableView.toMarkdown({
        title: "Contacts",
        rows: s.contacts.map(c => ({
          Name:    `${c.firstName} ${c.lastName}`,
          Email:   c.email ?? "",
          Title:   c.title ?? "",
          Company: c.company ?? "",
        })),
      }),
    }),
  },
});

export const Contact = defineAsset<ContactsState>({
  type: "contact/list",
  description: "Canonical contact list — people with email, phone, role.",
  schema: {
    type: "object",
    properties: { contacts: { type: "array" } },
    required: ["contacts"],
  },
  defaultView: ContactListView,
  mockState: () => ({
    contacts: [
      { id: "c1", firstName: "Jordan", lastName: "Lee",    email: "jordan@acme.com",       phone: "+1-555-0101", title: "Director of Ops", company: "Acme" },
      { id: "c2", firstName: "Maria",  lastName: "Santos", email: "maria@brightwave.com",  phone: "+1-555-0182", title: "VP Marketing",    company: "Brightwave" },
      { id: "c3", firstName: "Aiden",  lastName: "Park",   email: "aiden@meridian.com",    phone: "+1-555-0301", title: "CEO",             company: "Meridian" },
    ],
  }),
});
