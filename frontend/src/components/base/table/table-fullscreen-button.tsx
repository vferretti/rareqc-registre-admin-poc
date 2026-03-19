import { Maximize, Minimize } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/base/ui/tooltip";

interface TableFullscreenButtonProps {
  active: boolean;
  onClick: (value: boolean) => void;
}

export function TableFullscreenButton({ active, onClick }: TableFullscreenButtonProps) {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="sm" variant="ghost" onClick={() => onClick(!active)}>
          {active ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {active ? t("common.table.minimize") : t("common.table.maximize")}
      </TooltipContent>
    </Tooltip>
  );
}
