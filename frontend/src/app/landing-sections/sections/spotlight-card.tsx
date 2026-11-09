"use client";

import type { ReactNode } from "react";
import { useSpotlight } from "../hooks";

export function SpotlightCard({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const ref = useSpotlight();

  return (
    <div ref={ref} className={`lp-card-spotlight ${className}`} style={style}>
      {children}
    </div>
  );
}
