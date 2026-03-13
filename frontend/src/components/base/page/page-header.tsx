import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("border-b bg-background px-8 py-4", className)}>
      <h1 className="text-2xl font-bold flex items-center">{title}</h1>
      {description && <p className="mt-1 text-base text-muted-foreground">{description}</p>}
    </div>
  );
}

export { PageHeader };
