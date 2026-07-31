import { formatDate } from "@/lib/format";
import EmptyCell from "./empty-cell";

interface DateCellProps {
  date?: string | null;
}

function DateCell({ date }: DateCellProps) {
  if (!date) return <EmptyCell />;

  return <div className="font-mono">{formatDate(date)}</div>;
}

export default DateCell;
