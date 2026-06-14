"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [tick, setTick] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      setTick((t) => !t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <div className="flex-1 min-w-0" />;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = pad(hours % 12 || 12);
  const m = pad(minutes);
  const s = pad(seconds);

  const day = now.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  const sep = (
    <span
      className="mx-0.5 text-2xl font-black leading-none"
      style={{
        opacity: tick ? 1 : 0.2,
        transition: "opacity 0.15s",
        background: "linear-gradient(135deg, #a855f7, #6366f1)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      :
    </span>
  );

  const digitClass =
    "text-2xl font-black tabular-nums leading-none tracking-tighter";
  const gradientText = {
    background: "linear-gradient(135deg, #a855f7 0%, #6366f1 60%, #3b82f6 100%)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
    filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))",
  };

  return (
    <div className="flex flex-1 min-w-0 items-center justify-center select-none">
      <div
        className="hidden sm:flex flex-col items-center gap-0.5 rounded-2xl px-5 py-2 border border-violet-500/20"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 100%)",
          boxShadow: "0 0 18px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Date row */}
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60">
          {day}&nbsp;&nbsp;{dateStr}
        </span>

        {/* Time row */}
        <div className="flex items-center">
          <span className={digitClass} style={gradientText}>{h}</span>
          {sep}
          <span className={digitClass} style={gradientText}>{m}</span>
          {sep}
          <span className={digitClass} style={gradientText}>{s}</span>
          <span
            className="ml-1.5 self-end mb-0.5 text-[11px] font-bold tracking-wide"
            style={{
              background: "linear-gradient(135deg, #a855f7, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {ampm}
          </span>
        </div>
      </div>
    </div>
  );
}
