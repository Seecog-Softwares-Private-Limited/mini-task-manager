import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  valueProp?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export function EmptyState({ title, description, valueProp, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/10 py-16 px-6 text-center animate-fade-in">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {valueProp && (
        <p className="mt-2 max-w-md text-xs text-muted-foreground/80">{valueProp}</p>
      )}
      {action && (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
