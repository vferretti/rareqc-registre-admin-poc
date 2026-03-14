import { Badge } from "@/components/base/badges/badge";
import EmptyCell from "./empty-cell";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "green"
  | "blue"
  | "amber"
  | "violet";

interface BadgeCellProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
}

function BadgeCell({ children, variant = "secondary" }: BadgeCellProps) {
  if (!children) return <EmptyCell />;
  return <Badge variant={variant}>{children}</Badge>;
}

export default BadgeCell;
