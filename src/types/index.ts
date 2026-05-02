/**
 * Canonical types — abstract primitives any vendor can implement.
 *
 * A vendor asset (Gmail, Slack, …) declares which canonical type it
 * implements via `extends: ["email/mailbox"]`. Tools that consume the
 * canonical type then work uniformly across all vendor implementations.
 */

export { Email,    type EmailMessage,         type EmailMailboxState   } from "./email.js";
export { Message,  type ChatMessage,          type MessageState        } from "./message.js";
export { Contact,  type ContactRecord,        type ContactsState       } from "./contact.js";
export { Event,    type CalendarEventRecord,  type CalendarEventsState } from "./event.js";
export { Task,     type TaskRecord,           type TasksState          } from "./task.js";
export { Document, type DocumentRecord,       type DocumentState       } from "./document.js";

import { Email }    from "./email.js";
import { Message }  from "./message.js";
import { Contact }  from "./contact.js";
import { Event }    from "./event.js";
import { Task }     from "./task.js";
import { Document } from "./document.js";

export const canonicalTypes = { Email, Message, Contact, Event, Task, Document } as const;
