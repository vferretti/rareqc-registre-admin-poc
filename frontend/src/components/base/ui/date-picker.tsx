import * as React from "react";
import { format, parse, setMonth, setYear, getMonth, getYear } from "date-fns";
import type { Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/base/ui/button";
import { Calendar } from "@/components/base/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/base/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/ui/select";

const DATE_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "d MMMM yyyy";

const localeMap: Record<string, Locale> = {
  fr: fr,
  en: enUS,
};

interface DatePickerProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
  /** Show only the calendar icon as trigger, without the date text. */
  iconOnly?: boolean;
}

function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  maxDate,
  minDate,
  iconOnly,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(new Date());

  const locale = localeMap[i18n.language] ?? fr;

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    return parse(value, DATE_FORMAT, new Date());
  }, [value]);

  // Sync displayMonth when value changes or popover opens
  React.useEffect(() => {
    if (open && selectedDate) {
      setDisplayMonth(selectedDate);
    }
  }, [open, selectedDate]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(format(date, DATE_FORMAT));
    } else {
      onChange?.(undefined);
    }
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    if (maxDate && today > maxDate) return;
    if (minDate && today < minDate) return;
    onChange?.(format(today, DATE_FORMAT));
    setOpen(false);
  };

  // Month names for dropdown
  const monthNames = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2024, i, 1);
    return format(d, "MMMM", { locale });
  });

  // Year range for dropdown
  const minYear = minDate ? getYear(minDate) : getYear(new Date()) - 100;
  const maxYear = maxDate ? getYear(maxDate) : getYear(new Date()) + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <CalendarDays className="size-4 text-primary cursor-pointer hover:text-primary/80" />
        ) : (
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-start rounded-md border border-input bg-transparent px-3 py-1 text-sm font-normal shadow-xs",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            {selectedDate
              ? format(selectedDate, DISPLAY_FORMAT, { locale })
              : (placeholder ?? "")}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Month/Year navigation */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <Select
            value={String(getMonth(displayMonth))}
            onValueChange={(v) => setDisplayMonth(setMonth(displayMonth, Number(v)))}
          >
            <SelectTrigger className="h-8 flex-1 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={String(i)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(getYear(displayMonth))}
            onValueChange={(v) => setDisplayMonth(setYear(displayMonth, Number(v)))}
          >
            <SelectTrigger className="h-8 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          locale={locale}
        />

        {/* Today button */}
        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm"
            onClick={handleToday}
          >
            {t("common.today")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

DatePicker.displayName = "DatePicker";

export { DatePicker };
export type { DatePickerProps };
