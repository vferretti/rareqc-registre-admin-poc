import type { PropsWithChildren } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";

interface InformationFieldProps {
  label: string;
  labelTooltipText?: string;
  tooltipText?: string;
}

/** Displays a label / value pair in a two-column layout, replicating the radiant-portal pattern. */
export function InformationField({
  label,
  labelTooltipText,
  children,
  tooltipText,
}: PropsWithChildren<InformationFieldProps>) {
  const labelContent = labelTooltipText ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="underline decoration-dotted underline-offset-4 cursor-pointer">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{labelTooltipText}</TooltipContent>
    </Tooltip>
  ) : (
    label
  );

  const valueContent = children ?? <span>-</span>;
  const content = tooltipText ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-pointer">{valueContent}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  ) : (
    valueContent
  );

  return (
    <div className="inline-flex gap-2 justify-between text-sm">
      <span className="text-muted-foreground flex-1">{labelContent}</span>
      <span className="flex-1">{content}</span>
    </div>
  );
}
