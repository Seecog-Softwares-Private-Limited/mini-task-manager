"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackFormDialog } from "@/components/feedbacks/feedback-form-dialog";
import { cn } from "@/lib/utils";

type FeedbackTriggerButtonProps = {
  className?: string;
  showLabel?: boolean;
};

/** Header control for customers to submit feedback (visible to super admins only after submit). */
export function FeedbackTriggerButton({
  className,
  showLabel = false,
}: FeedbackTriggerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        className={cn(
          "relative shrink-0 text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200",
          showLabel && "gap-1.5 px-2.5",
          className
        )}
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <span className="relative inline-flex">
          <Sparkles className="h-[18px] w-[18px]" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-background" />
        </span>
        {showLabel ? <span className="text-sm font-medium">Feedback</span> : null}
      </Button>
      <FeedbackFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
