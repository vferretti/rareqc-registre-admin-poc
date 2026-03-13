import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  startIcon,
  ...props
}: React.ComponentProps<"input"> & {
  startIcon?: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      {startIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {startIcon}
        </div>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          startIcon && "pl-9",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { Input };
