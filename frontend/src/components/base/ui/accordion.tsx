import { useState } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import isEqual from "lodash/isEqual";
import uniq from "lodash/uniq";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { AccordionContext } from "@/components/base/ui/use-accordion-context";

/**
 * Accordion should support different mount mode in the futur
 * @see https://github.com/radix-ui/primitives/discussions/855#discussioncomment-1621945
 *
 * Added our own "lazy" mode utils further update
 */
type AccordionProps =
  | AccordionPrimitive.AccordionMultipleProps
  | AccordionPrimitive.AccordionSingleProps;
const Accordion = function ({ ...props }: AccordionProps) {
  // Keep a history of every value that has ever been opened. We use the
  // "syncing state on prop change during render" pattern (preferred over a
  // useEffect+setState). See https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  const [history, setHistory] = useState<string[]>([]);
  const [prevValue, setPrevValue] = useState(props.value);
  if (!isEqual(prevValue, props.value)) {
    setPrevValue(props.value);
    setHistory((prev) => uniq([...prev, ...(props.value ?? [])]));
  }

  return (
    <AccordionContext value={{ history }}>
      <AccordionPrimitive.Root {...props} />
    </AccordionContext>
  );
};

const AccordionItem = function ({
  className,
  ...props
}: AccordionPrimitive.AccordionItemProps) {
  return (
    <AccordionPrimitive.Item className={cn("border-b", className)} {...props} />
  );
};
AccordionItem.displayName = "AccordionItem";

export interface AccordionTriggerProps
  extends AccordionPrimitive.AccordionTriggerProps {
  chevronPlacement?: "left" | "right";
}
function AccordionTrigger({
  className,
  children,
  chevronPlacement = "left",
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex justify-between items-center">
      <AccordionPrimitive.Trigger
        className={cn("py-2 transition-all group w-full", className)}
        {...props}
      >
        <div className="flex flex-1 items-center">
          {chevronPlacement === "left" && (
            <ChevronRight className="size-4 text-muted-foreground shrink-0 group-data-[state=open]:rotate-90 transition-transform duration-200 mr-2" />
          )}
          {children}
          {chevronPlacement === "right" && (
            <ChevronDown className="size-4 text-muted-foreground shrink-0 group-data-[state=open]:rotate-180 transition-transform duration-200 ml-2" />
          )}
        </div>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

/**
 * forceMount props will disable animation
 * @see https://github.com/radix-ui/primitives/discussions/855#discussioncomment-1621945
 */
function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        "overflow-hidden text-sm transition-all data-[state=open]:animate-accordion-down ",
        {
          "data-[state=closed]:hidden": props.forceMount,
          "data-[state=closed]:animate-accordion-up ": !props.forceMount,
        },
      )}
      {...props}
    >
      <div className={cn("pb-2 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
