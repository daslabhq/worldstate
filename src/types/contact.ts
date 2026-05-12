/**
 * Contact — canonical type for people / contact records.
 *
 * Vendor implementations: Salesforce, HubSpot, Airtable, Pipedrive,
 * Notion, Google Contacts, …
 */

import { defineAsset } from "../asset.js";
import { defineView } from "../view.js";
import { ICONS } from "../views/heroicons.js";
import type { WidgetData } from "../widgets.js";

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
    icon: (s): WidgetData => ({
      type: "icon",
      glyph: ICONS.users,
      color: "purple",
      label: "Contacts",
      badge: s.contacts.length || undefined,
    }),

    small: (s): WidgetData => {
      const top = s.contacts[0];
      return {
        type: "stack",
        header: { glyph: ICONS.users, color: "purple", title: `${s.contacts.length} contacts` },
        body: top ? [{
          type: "list",
          items: [{
            id: top.id,
            title: `${top.firstName} ${top.lastName}`,
            subtitle: top.title ?? top.company ?? top.email ?? "",
          }],
        }] : [{ type: "empty", message: "no contacts" }],
      };
    },

    medium: (s): WidgetData => ({
      type: "stack",
      header: { glyph: ICONS.users, color: "purple", title: "Contacts", meta: `${s.contacts.length}` },
      body: [{
        type: "table",
        columns: ["Name", "Email", "Title"],
        rows: s.contacts.slice(0, 5).map(c => ({
          Name:  `${c.firstName} ${c.lastName}`,
          Email: c.email ?? "",
          Title: c.title ?? "",
        })),
      }],
    }),

    large: (s): WidgetData => ({
      type: "table",
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
