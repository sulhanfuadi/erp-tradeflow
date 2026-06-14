"use client";

import { useEffect } from "react";
import { ApiError } from "@/lib/api/errors";

// Monkeypatch console.error as early as possible in client execution
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    const msg = args.map(arg => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message + "\n" + arg.stack;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    // 1. Suppress script tag warning inside React components (common issue with next-themes in React 19)
    if (
      msg.includes("Encountered a script tag while rendering React component") ||
      msg.includes("developer.mozilla.org/en-US/docs/Web/HTML/Element/template")
    ) {
      return;
    }

    // 2. Suppress Next.js / React hydration mismatches
    if (
      msg.includes("Hydration failed") ||
      msg.includes("hydration-mismatch") ||
      msg.includes("Server rendered text didn't match the client") ||
      msg.includes("Text content did not match") ||
      msg.includes("did not match server")
    ) {
      return;
    }

    originalError.apply(console, args);
  };
}

/**
 * Prevents the Next.js dev error overlay from showing for expected API errors
 * (e.g. 403 Supplier not found or unauthorized when editing the global demo supplier).
 * Errors are still logged and toasts are shown by mutation onError; we only suppress
 * the full-screen overlay so the UI stays usable.
 */
export function SuppressApiErrorOverlay() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      if (reason instanceof ApiError || reason?.name === "ApiError") {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return null;
}

