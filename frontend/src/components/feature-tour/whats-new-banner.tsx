"use client";

import { useState, useEffect } from "react";
import { getTourSeen, setTourSeen, TOUR_IDS } from "@/lib/feature-tour-storage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE = {
  title: "What's new",
  body: "Kanban boards and Data Tables are here. Drag tasks between columns and sort or filter your projects.",
};

export function WhatsNewBanner({
  title = DEFAULT_MESSAGE.title,
  body = DEFAULT_MESSAGE.body,
  className,
}: {
  title?: string;
  body?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !getTourSeen(TOUR_IDS.whatsNew)) setVisible(true);
  }, [mounted]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm",
        className
      )}
      role="status"
    >
      <div>
        <span className="font-medium">{title}</span>
        <span className="ml-2 text-muted-foreground">{body}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setTourSeen(TOUR_IDS.whatsNew);
          setVisible(false);
        }}
      >
        Got it
      </Button>
    </div>
  );
}
