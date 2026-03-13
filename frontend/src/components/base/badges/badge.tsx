import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md transition-colors px-1.5 py-0.5 text-xs [&_svg]:size-3 gap-1 outline-none font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "text-foreground border",
        amber: "bg-amber/20 text-amber-foreground",
        red: "bg-red/20 text-red-foreground",
        orange: "bg-orange/20 text-orange-foreground",
        yellow: "bg-yellow/20 text-yellow-foreground",
        lime: "bg-lime/20 text-lime-foreground",
        green: "bg-green/20 text-green-foreground",
        cyan: "bg-cyan/20 text-cyan-foreground",
        blue: "bg-blue/20 text-blue-foreground",
        violet: "bg-violet/20 text-violet-foreground",
        fuchsia: "bg-fuchsia/20 text-fuchsia-foreground",
        neutral: "bg-neutral/20 text-neutral-foreground",
      },
      size: {
        default: "",
        lg: "px-3 py-1.5 text-sm",
      },
      iconOnly: {
        true: "size-5 p-0 items-center justify-center",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      iconOnly: false,
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  onClose?: () => void;
  count?: number;
}

function Badge({ className, variant, size, iconOnly, count, onClose, children, ...props }: BadgeProps) {
  const showCount = count !== undefined;

  return (
    <div
      className={cn(
        badgeVariants({ variant, size, iconOnly }),
        props.onClick && "hover:cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
      {showCount && (
        <>
          <span className="inline-block h-3.5 w-px bg-current opacity-65" />
          <span>{count}</span>
        </>
      )}
      {onClose && (
        <button className="opacity-65 hover:cursor-pointer hover:opacity-100" onClick={onClose}>
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
