/**
 * Statistics Card Component
 * Glassmorphism card component for displaying warehouse statistics
 * Supports light/dark mode with colored variants (sky, emerald, amber, rose)
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GlassCard, CardVariant } from "@/components/ui/glass-card";

export interface BadgeData {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export interface StatisticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: CardVariant;
  badges?: BadgeData[];
  className?: string;
}

export function StatisticsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "sky",
  badges = [],
  className,
}: StatisticsCardProps) {
  return (
    <GlassCard
      variant={variant}
      className={cn(
        "min-h-[210px] flex flex-col p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-visible">
        <div className="flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs uppercase tracking-[0.45em] text-gray-700 dark:text-white/60 min-w-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 shadow-inner shadow-primary/30 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
          </div>
        </div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
            {description}
          </p>
        )}
        {badges.length > 0 && (
          <div className="mt-3 flex w-full min-w-0 flex-wrap gap-2 overflow-visible">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "outline"}
                className="text-xs border-gray-300/50 bg-gray-100/80 text-gray-800 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-white/5 dark:text-white/80"
              >
                <span className="font-medium">{badge.label}:</span>{" "}
                <span className="ml-1">{badge.value}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
