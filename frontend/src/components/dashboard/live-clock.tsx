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
      className="mx-0.5 text-2xl font-black leading-none text-slate-800 dark:text-slate-100"
      style={{ opacity: tick ? 1 : 0.2, transition: "opacity 0.15s" }}
    >
      :
    </span>
  );

  const digitClass =
    "text-2xl font-black tabular-nums leading-none tracking-tighter text-slate-900 dark:text-slate-50";

  return (
    <div className="flex flex-1 min-w-0 items-center justify-center select-none">
      <div
        className="hidden sm:flex flex-col items-center gap-0.5 rounded-2xl px-5 py-2 border border-sky-200 dark:border-sky-800"
        style={{
          background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
          boxShadow: "0 2px 12px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {/* Date row */}
        <span className="text-[10px] font-semibold tracking-[0.18em] text-sky-700">
          {day}&nbsp;&nbsp;{dateStr}
        </span>

        {/* Time row */}
        <div className="flex items-center">
          <span className={digitClass}>{h}</span>
          {sep}
          <span className={digitClass}>{m}</span>
          {sep}
          <span className={digitClass}>{s}</span>
          <span className="ml-1.5 self-end mb-0.5 text-[11px] font-bold tracking-wide text-sky-700">
            {ampm}
          </span>
        </div>
      </div>
    </div>
  );
}
