"use client";

import { useCounter } from "../hooks";

export function AnimatedStat({ end, prefix = "", suffix = "" }: { end: number; prefix?: string; suffix?: string }) {
  const ref = useCounter(end, 1400);

  return (
    <span className="tabular-nums">
      {prefix}
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}
