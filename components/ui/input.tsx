import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2.5 text-base shadow-sm shadow-inner transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:outline-none focus-visible:border-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/50",
          "dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50 dark:focus-visible:border-primary dark:focus-visible:ring-primary/50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
