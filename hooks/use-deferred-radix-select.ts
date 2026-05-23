"use client";

/**
 * Safe mount gate for Radix Select (portal to document.body).
 * Prevents React removeChild errors when App Router navigates between pages
 * while a Select portal is mounting or unmounting (e.g. /products → /orders).
 */

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type UseDeferredRadixSelectOptions = {
  /** When false (e.g. table isLoading), unmount Select before skeleton swap */
  enabled?: boolean;
};

export type UseDeferredRadixSelectResult = {
  showSelect: boolean;
  /** Pass as React key on Select root to remount per route */
  selectRemountKey: string;
};

export function useDeferredRadixSelect(
  options: UseDeferredRadixSelectOptions = {},
): UseDeferredRadixSelectResult {
  const { enabled = true } = options;
  const pathname = usePathname();
  const routeKey = pathname ?? "";
  const [routeStable, setRouteStable] = useState(false);
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!enabled) {
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setRouteStable(true);
    });

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setRouteStable(false);
    };
  }, [routeKey, enabled]);

  const showSelect = enabled && routeStable;

  return { showSelect, selectRemountKey: routeKey };
}
