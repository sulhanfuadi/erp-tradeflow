/**
 * Locale-stable date formatting for SSR + client hydration.
 * Avoids toLocaleDateString / formatDistanceToNow mismatches (server vs browser locale/time).
 */

import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Fixed pattern for SSR and hydration (en-US). */
export function formatStableDate(value: Date | string | number): string {
  return format(toDate(value), "MMM d, yyyy", { locale: enUS });
}

/** Fixed date + time for detail pages (en-US). */
export function formatStableDateTime(value: Date | string | number): string {
  return format(toDate(value), "MMM d, yyyy h:mm a", { locale: enUS });
}

/** Relative time — use only after mount (see ClientRelativeTime). */
export function formatStableRelative(value: Date | string | number): string {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}
