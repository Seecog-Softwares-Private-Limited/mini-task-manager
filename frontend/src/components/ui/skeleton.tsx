import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:border-t before:border-white/10 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
