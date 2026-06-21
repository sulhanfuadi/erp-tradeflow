import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import React from "react";
import { GlassCard, CardVariant } from "@/components/ui/glass-card";

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  description?: string;
  variant?: CardVariant;
}

export function ChartCard({
  title,
  icon: Icon,
  children,
  className,
  description,
  variant = "neutral",
}: ChartCardProps) {
  return (
    <GlassCard
      variant={variant}
      className={cn("p-0 overflow-hidden", className)}
    >
      <div className="flex flex-row items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-white/70 mt-1">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className="h-4 w-4 text-gray-700 dark:text-white/80" />
          </div>
        )}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </GlassCard>
  );
}
