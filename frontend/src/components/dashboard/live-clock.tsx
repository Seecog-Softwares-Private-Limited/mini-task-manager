"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className="hidden h-4 w-32 animate-pulse rounded bg-muted/40 md:inline-block" aria-hidden />;
  }

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const time = `${pad(hours % 12 || 12)}:${pad(minutes)} ${ampm}`;
  const date = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <p
      className="hidden select-none truncate text-xs text-muted-foreground md:block"
      aria-live="polite"
      aria-label={`${date}, ${time}`}
    >
      <span className="font-medium text-foreground/80">{date}</span>
      <span className="mx-2 text-border">·</span>
      <span className="tabular-nums">{time}</span>
    </p>
  );
}
