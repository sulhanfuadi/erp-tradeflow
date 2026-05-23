"use client";

/**
 * Hydration-safe date display for client components pre-rendered on the server.
 * Server and first client paint use en-US stable strings; relative labels update after mount.
 */

import { useEffect, useMemo, useState } from "react";
import {
  formatStableDate,
  formatStableDateTime,
  formatStableRelative,
  toDate,
} from "@/lib/date/format-stable";
import { useMounted } from "@/hooks/use-mounted";

type DateInput = Date | string | number;

export type ClientRelativeTimeProps = {
  date: DateInput;
  className?: string;
  /** Optional prefix, e.g. "Created " */
  prefix?: string;
};

export function ClientRelativeTime({
  date,
  className,
  prefix = "",
}: ClientRelativeTimeProps) {
  const d = useMemo(() => toDate(date), [date]);
  const stable = useMemo(() => formatStableDate(d), [d]);
  const [label, setLabel] = useState(stable);
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted) return;
    const tick = () => setLabel(formatStableRelative(d));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [mounted, d]);

  return (
    <span className={className}>
      {prefix}
      {label}
    </span>
  );
}

export type ClientDateTimeProps = {
  date: DateInput;
  className?: string;
};

/** Absolute date+time — same output on server and client (no hydration mismatch). */
export function ClientDateTime({ date, className }: ClientDateTimeProps) {
  const text = useMemo(() => formatStableDateTime(date), [date]);
  return <span className={className}>{text}</span>;
}

export type ClientDateProps = {
  date: DateInput;
  className?: string;
  prefix?: string;
};

/** Absolute date only — same output on server and client. */
export function ClientDate({ date, className, prefix = "" }: ClientDateProps) {
  const text = useMemo(() => formatStableDate(date), [date]);
  return (
    <span className={className}>
      {prefix}
      {text}
    </span>
  );
}
