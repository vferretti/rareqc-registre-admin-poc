import { format, parseISO } from "date-fns";
import EmptyCell from "./empty-cell";

interface DateCellProps {
  date?: string | null;
}

function DateCell({ date }: DateCellProps) {
  if (!date) return <EmptyCell />;

  const formatted = format(parseISO(date), "yyyy-MM-dd");

  return <div className="font-mono">{formatted}</div>;
}

export default DateCell;
