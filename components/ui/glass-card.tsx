"use client";

import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal"
  | "neutral";

export const variantConfig: Record<
  CardVariant,
  {
    border: string;
    gradient: string;
    shadow: string;
    hoverBorder: string;
    iconBg?: string;
  }
> = {
  sky: {
    border: "border-sky-400/20",
    gradient: "bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(2,132,199,0.15)] dark:shadow-[0_15px_40px_rgba(2,132,199,0.1)]",
    hoverBorder: "hover:border-sky-300/40",
    iconBg: "border-sky-300/30 bg-sky-100/50",
  },
  emerald: {
    border: "border-emerald-400/20",
    gradient: "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(16,185,129,0.15)] dark:shadow-[0_15px_40px_rgba(16,185,129,0.1)]",
    hoverBorder: "hover:border-emerald-300/40",
    iconBg: "border-emerald-300/30 bg-emerald-100/50",
  },
  amber: {
    border: "border-amber-400/20",
    gradient: "bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(245,158,11,0.12)] dark:shadow-[0_15px_40px_rgba(245,158,11,0.08)]",
    hoverBorder: "hover:border-amber-300/40",
    iconBg: "border-amber-300/30 bg-amber-100/50",
  },
  rose: {
    border: "border-rose-400/20",
    gradient: "bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(225,29,72,0.15)] dark:shadow-[0_15px_40px_rgba(225,29,72,0.1)]",
    hoverBorder: "hover:border-rose-300/40",
    iconBg: "border-rose-300/30 bg-rose-100/50",
  },
  violet: {
    border: "border-violet-400/20",
    gradient: "bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(139,92,246,0.15)] dark:shadow-[0_15px_40px_rgba(139,92,246,0.1)]",
    hoverBorder: "hover:border-violet-300/40",
    iconBg: "border-violet-300/30 bg-violet-100/50",
  },
  blue: {
    border: "border-blue-400/20",
    gradient: "bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(59,130,246,0.15)] dark:shadow-[0_15px_40px_rgba(59,130,246,0.1)]",
    hoverBorder: "hover:border-blue-300/40",
    iconBg: "border-blue-300/30 bg-blue-100/50",
  },
  orange: {
    border: "border-orange-400/20",
    gradient: "bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(249,115,22,0.15)] dark:shadow-[0_15px_40px_rgba(249,115,22,0.1)]",
    hoverBorder: "hover:border-orange-300/40",
    iconBg: "border-orange-300/30 bg-orange-100/50",
  },
  teal: {
    border: "border-teal-400/20",
    gradient: "bg-gradient-to-br from-teal-500/15 via-teal-500/5 to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(20,184,166,0.15)] dark:shadow-[0_15px_40px_rgba(20,184,166,0.1)]",
    hoverBorder: "hover:border-teal-300/40",
    iconBg: "border-teal-300/30 bg-teal-100/50",
  },
  neutral: {
    border: "border-gray-300/30 dark:border-white/10",
    gradient: "bg-gradient-to-br from-gray-100/50 via-gray-50/30 to-transparent dark:from-white/5 dark:via-white/2 dark:to-transparent",
    shadow: "shadow-[0_15px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.2)]",
    hoverBorder: "hover:border-gray-300/50 dark:hover:border-white/20",
  },
};

export interface GlassCardProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: CardVariant;
  hoverEffect?: boolean;
}

/**
 * A reusable premium glass-morphic card component.
 * Standardizes the "Glassmorphism" UI aesthetic across the application.
 */
export function GlassCard({
  children,
  className,
  variant = "blue",
  hoverEffect = false,
  ...props
}: GlassCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[20px] border p-4 sm:p-5 backdrop-blur-xl transition-all duration-300",
        "bg-white/60 dark:bg-slate-900/40",
        config.border,
        config.gradient,
        config.shadow,
        hoverEffect && cn("hover:-translate-y-1 hover:shadow-2xl", config.hoverBorder),
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full w-full">{children}</div>
    </article>
  );
}
