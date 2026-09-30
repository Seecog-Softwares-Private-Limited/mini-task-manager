"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { parseApiError } from "@/services/api/client";
import { normalizeApiError } from "@/lib/error";
import {
  suggestSubtasks,
  type SuggestSubtasksRequest,
} from "@/services/api/ai.api";
import { cn } from "@/lib/utils";

interface SubtaskSuggestionsPanelProps {
  request: SuggestSubtasksRequest;
  /** Titles already on the checklist. Used only to hide duplicates in this session. */
  existingTitles?: string[];
  disabled?: boolean;
  disabledReason?: string;
  note?: string;
  /** Create sheet: the task title is the prompt. The button sits under it. */
  variant?: "panel" | "create";
  /** Existing task: one text box for the purpose, then Suggest. Not a chat. */
  purposeInput?: boolean;
  taskDescription?: string;
  /** When false, the parent already reports accept failures. */
  reportAcceptErrors?: boolean;
  onAccept: (titles: string[]) => Promise<void> | void;
}

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withoutExisting(titles: string[], existingTitles: string[]): string[] {
  const taken = new Set(existingTitles.map(normalizeTitle).filter((title) => title.length > 0));
  const kept: string[] = [];
  for (const title of titles) {
    const key = normalizeTitle(title);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    kept.push(title.trim());
  }
  return kept;
}

function suggestionRequestError(err: unknown): string {
  const status = normalizeApiError(err).statusCode;
  if (status === 503 || status === 504) {
    return "AI suggestions are unavailable right now. Try again later.";
  }
  if (status === 422) {
    return "AI returned an unusable response. Try again.";
  }
  return parseApiError(err);
}

export function SubtaskSuggestionsPanel({
  request,
  existingTitles = [],
  disabled,
  disabledReason,
  note,
  variant = "panel",
  purposeInput = false,
  taskDescription,
  reportAcceptErrors = true,
  onAccept,
}: SubtaskSuggestionsPanelProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [purpose, setPurpose] = React.useState("");
  const [asked, setAsked] = React.useState(false);
  const purposeRef = React.useRef(purpose);
  purposeRef.current = purpose;
  const descriptionRef = React.useRef(taskDescription);
  descriptionRef.current = taskDescription;
  const requestRef = React.useRef(request);
  const existingRef = React.useRef(existingTitles);
  const savingRef = React.useRef(false);
  const loadingRef = React.useRef(false);
  const suggestionsRef = React.useRef(suggestions);
  requestRef.current = request;
  existingRef.current = existingTitles;
  suggestionsRef.current = suggestions;
  const existingKey = existingTitles.map(normalizeTitle).filter((title) => title.length > 0).join("\n");

  React.useEffect(() => {
    setSuggestions((current) => {
      const next = withoutExisting(current, existingRef.current);
      if (next.length === current.length && next.every((title, index) => title === current[index])) {
        return current;
      }
      return next;
    });
  }, [existingKey]);

  const busy = loading || saving || disabled;

  const suggest = async () => {
    if (loadingRef.current || savingRef.current || disabled) return;
    const purposeText = purposeRef.current.trim().slice(0, 300);
    if (purposeInput && !purposeText) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const shown = suggestionsRef.current.map((title) => title.trim()).filter((title) => title.length > 0);
      const baseRequest = purposeInput
        ? {
            draft: {
              title: purposeText,
              description: descriptionRef.current?.trim() || undefined,
              subtasks: existingRef.current
                .map((title) => title.trim())
                .filter((title) => title.length > 0)
                .map((title) => ({ title })),
            },
          }
        : requestRef.current;
      const result = await suggestSubtasks(
        shown.length > 0 ? { ...baseRequest, excludeTitles: shown } : baseRequest,
      );
      setSuggestions(withoutExisting(result.suggestions.map((item) => item.title), existingRef.current));
      setAsked(true);
    } catch (err) {
      toast({
        title: "Could not suggest subtasks",
        description: suggestionRequestError(err),
        variant: "error",
      });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const accept = async (titles: string[]) => {
    if (!titles.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onAccept(titles);
      const accepted = new Set(titles);
      setSuggestions((current) => current.filter((title) => !accepted.has(title)));
    } catch (err) {
      if (reportAcceptErrors) {
        toast({
          title: "Could not add subtasks",
          description: parseApiError(err),
          variant: "error",
        });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const suggestButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 border-sky-300 bg-white text-sky-800 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-transparent dark:text-sky-100 dark:hover:bg-sky-500/10"
      onClick={() => void suggest()}
      disabled={busy || (purposeInput && purpose.trim().length === 0)}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
      )}
      {variant === "create" ? "Suggest" : "Suggest"}
    </Button>
  );

  const suggestionList = (
    <>
      {disabled && disabledReason ? (
        <p className="mt-2 text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {asked && suggestions.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-sky-900/80 dark:text-sky-100/80">
          No additional subtasks to suggest.
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="mt-3 space-y-2">
          <ul className="space-y-2">
            {suggestions.map((title) => (
              <li
                key={title}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-sky-200/80 border-l-4 border-l-sky-500 bg-white/80 px-3 py-2",
                  "dark:border-sky-500/20 dark:bg-background/40"
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden />
                <span className="min-w-0 flex-1 text-sm text-foreground">{title}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-sky-300 text-sky-800 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-100"
                  disabled={busy}
                  onClick={() => void accept([title])}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={busy}
              onClick={() => {
                setSuggestions([]);
                setAsked(false);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden />
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              disabled={busy}
              onClick={() => void accept(suggestions)}
            >
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Add all
            </Button>
          </div>
        </div>
      ) : asked ? (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setAsked(false)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}
    </>
  );

  if (variant === "create") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{suggestButton}</div>
        {asked || suggestions.length > 0 ? (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 dark:border-sky-500/20 dark:bg-sky-500/5">
            <h4 className="text-sm font-medium text-sky-950 dark:text-sky-100">AI Suggested subtasks</h4>
            <p className="mt-1 text-xs text-sky-900/70 dark:text-sky-100/70">
              {note ?? "Suggestions stay separate until you add them."}
            </p>
            {suggestionList}
          </div>
        ) : disabled && disabledReason ? (
          <p className="text-xs text-muted-foreground">{disabledReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 dark:border-sky-500/20 dark:bg-sky-500/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </span>
            <h4 className="text-sm font-medium text-sky-950 dark:text-sky-100">AI Suggested subtasks</h4>
          </div>
          <p className="mt-1 text-xs text-sky-900/70 dark:text-sky-100/70">
            {note ?? "Suggestions stay separate until you add them."}
          </p>
          {purposeInput ? (
            <textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value.slice(0, 300))}
              placeholder="I want to repair my bike"
              rows={2}
              disabled={busy}
              className="mt-3 w-full resize-none rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-sky-500/20 dark:border-sky-500/30 dark:bg-background"
            />
          ) : null}
        </div>
        {suggestButton}
      </div>
      {suggestionList}
    </div>
  );
}
