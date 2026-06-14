/**
 * Root layout: fonts, metadata (SEO), and providers (Query, Auth, Theme, Toaster).
 * Wraps all pages; force-dynamic so useSearchParams and server session work correctly.
 */
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import React from "react";
import { AuthProvider } from "@/contexts";
import { QueryProvider } from "@/lib/react-query";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SuppressApiErrorOverlay } from "@/components/shared/SuppressApiErrorOverlay";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

/** Force dynamic rendering for all routes so useSearchParams etc. work without Suspense and pages render instantly. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "TradeFlow — Enterprise Trade Engine",
    template: "%s | TradeFlow — Enterprise Trade Engine",
  },
  description:
    "TradeFlow is a full-stack enterprise trade engine built with Next.js. Manage products, categories, suppliers, orders, invoices, and warehouses. Role-based access for admin, client, and supplier.",
  authors: [
    {
      name: "TradeFlow Team",
      url: "https://example.com",
      email: "contact@example.com",
    },
  ],
  creator: "TradeFlow Team",
  publisher: "TradeFlow Team",
  applicationName: "TradeFlow",
  keywords: [
    "trade engine",
    "erp",
    "inventory management",
    "warehouse management",
    "stock management system",
    "Next.js",
    "React",
    "Prisma",
    "product catalog",
    "orders",
    "invoices",
    "suppliers",
    "categories",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    other: [{ rel: "icon", url: "/favicon.ico" }],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "TradeFlow — Enterprise Trade Engine",
    description:
      "Efficiently manage products, orders, invoices, and warehouses with TradeFlow. Secure, responsive, role-based inventory system.",
    url: "http://localhost:3000",
    siteName: "TradeFlow",
    images: [
      {
        url: "/favicon.ico",
        width: 32,
        height: 32,
        alt: "TradeFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeFlow — Enterprise Trade Engine",
    description:
      "Efficiently manage products, orders, invoices, and warehouses. Secure, responsive inventory system.",
    images: ["/favicon.ico"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ overscrollBehavior: "none" }}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
        suppressHydrationWarning
        style={{ overscrollBehavior: "none" }}
      >
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <SuppressApiErrorOverlay />
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider delayDuration={200}>
                  <KeyboardShortcutsProvider>
                    {children}
                  </KeyboardShortcutsProvider>
                </TooltipProvider>
              </ThemeProvider>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
