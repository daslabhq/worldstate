/**
 * App-icon helper — produces an iOS-style squircle tile with a Heroicons
 * v2 outline glyph centered, plus an optional notification badge.
 *
 * Heroicons (https://heroicons.com) are MIT-licensed by Tailwind Labs.
 * Inlined here so the gallery has no external icon dep.
 *
 * Color palette mirrors Apple's stock app icons where applicable:
 *   email    → blue   (Mail)
 *   message  → green  (Messages)
 *   event    → red    (Calendar)
 *   task     → orange (Reminders)
 *   document → yellow (Notes)
 *   contact  → purple (differentiates from Email blue)
 */

import { escapeHtml } from "../view.js";

export type IconColor = "blue" | "green" | "purple" | "red" | "orange" | "yellow" | "indigo" | "pink" | "teal" | "gray";

const COLORS: Record<IconColor, { from: string; to: string; fg: string }> = {
  blue:   { from: "#0a84ff", to: "#0040dd", fg: "#fff" },
  green:  { from: "#34c759", to: "#1ca647", fg: "#fff" },
  purple: { from: "#af52de", to: "#7e3fb1", fg: "#fff" },
  red:    { from: "#ff3b30", to: "#d92520", fg: "#fff" },
  orange: { from: "#ff9500", to: "#e07700", fg: "#fff" },
  yellow: { from: "#ffcc00", to: "#e0a800", fg: "#3a2a00" },
  indigo: { from: "#5856d6", to: "#3f3eaf", fg: "#fff" },
  pink:   { from: "#ff2d92", to: "#d11270", fg: "#fff" },
  teal:   { from: "#32ade6", to: "#1a8fc7", fg: "#fff" },
  gray:   { from: "#8e8e93", to: "#636366", fg: "#fff" },
};

// Heroicons v2 outline, stroke-width 2 (slightly heavier than default 1.5
// for better legibility at small sizes)
export const ICONS = {
  envelope:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>
    </svg>`,
  chat:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"/>
    </svg>`,
  users:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
    </svg>`,
  calendar:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/>
    </svg>`,
  checkCircle:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
    </svg>`,
  documentText:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
    </svg>`,
  cube:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>
    </svg>`,
  newspaper:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"/>
    </svg>`,
} as const;

export interface AppIconProps {
  /** Display name shown under the squircle. */
  name:    string;
  /** SVG markup — typically one of ICONS.* */
  glyph:   string;
  /** Color palette key. */
  color:   IconColor;
  /** Optional notification badge value (number or short text). */
  badge?:  number | string;
}

/** Render an iOS-style app icon (squircle + glyph + optional badge + label). */
export function appIcon(p: AppIconProps): string {
  const palette = COLORS[p.color];
  const badge = p.badge != null && p.badge !== 0 && p.badge !== ""
    ? `<div class="ws-app-badge">${escapeHtml(p.badge)}</div>`
    : "";
  return `<div class="ws-app-icon">
    <div class="ws-app-tile" style="background:linear-gradient(160deg,${palette.from} 0%,${palette.to} 100%);color:${palette.fg}">
      <div class="ws-app-glyph">${p.glyph}</div>
      ${badge}
    </div>
    <div class="ws-app-name">${escapeHtml(p.name)}</div>
  </div>`;
}

/** Render just the squircle (without label) — for use inline in small/medium cards. */
export function appIconChip(p: Omit<AppIconProps, "name">): string {
  const palette = COLORS[p.color];
  return `<div class="ws-app-tile ws-app-tile--chip" style="background:linear-gradient(160deg,${palette.from} 0%,${palette.to} 100%);color:${palette.fg}">
    <div class="ws-app-glyph">${p.glyph}</div>
  </div>`;
}
