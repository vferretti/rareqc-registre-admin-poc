import { useTranslation } from "react-i18next";
import EmptyCell from "./empty-cell";

interface TimestampCellProps {
  date?: string | null;
}

/** Displays a date with time (e.g. 2026-03-14 15:30). */
function TimestampCell({ date }: TimestampCellProps) {
  const { i18n } = useTranslation();

  if (!date) return <EmptyCell />;

  const d = new Date(date);

  return (
    <span className="font-mono">
      {d.toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })}{" "}
      {d.toLocaleTimeString(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

export default TimestampCell;
