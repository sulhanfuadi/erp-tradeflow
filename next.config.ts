import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { SENTRY_TUNNEL_PATH } from "./lib/monitoring/sentry-config";
import { buildNextProductionHeaderRules } from "./lib/vercel/production-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "robohash.org",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  poweredByHeader: false,

  // Playwright runs against 127.0.0.1; allow dev resources for Windows/local E2E.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Security + /_next/static immutable cache — see lib/vercel/production-headers.ts
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return buildNextProductionHeaderRules();
  },
};

const isProd = process.env.NODE_ENV === "production";

export default isProd 
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG ?? "arnob-mahmuds-org",
      project: process.env.SENTRY_PROJECT ?? "stock-inventory",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: SENTRY_TUNNEL_PATH,
      webpack: {
        automaticVercelMonitors: true,
        treeshake: {
          removeDebugLogging: true,
        },
      },
    })
  : nextConfig;
