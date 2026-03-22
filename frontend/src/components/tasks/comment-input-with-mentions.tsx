"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { OrgMember } from "@/types/api";

export interface CommentInputWithMentionsProps {
  value: string;
  onChange: (value: string, mentionedUserIds: string[]) => void;
  onSubmit: (text: string, mentionedUserIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  isSubmitting?: boolean;
  orgMembers: OrgMember[];
  currentUserId: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
  /** Merged onto the inner textarea (e.g. task modal composer). */
  textareaClassName?: string;
  rows?: number;
}

/** Extracts the @mention query and start index from text up to cursor. */
function getMentionState(text: string, cursorPos: number): { query: string; startIndex: number } | null {
  const beforeCursor = text.slice(0, cursorPos);
  const lastAt = beforeCursor.lastIndexOf("@");
  if (lastAt === -1) return null;
  // Check that @ is at start or preceded by whitespace (not part of email)
  const charBefore = lastAt > 0 ? beforeCursor[lastAt - 1] : " ";
  if (charBefore !== " " && charBefore !== "\n") return null;
  const query = beforeCursor.slice(lastAt + 1);
  // If there's a space in the query, we've moved past the mention
  if (query.includes(" ") || query.includes("\n")) return null;
  return { query: query.toLowerCase(), startIndex: lastAt };
}

export function CommentInputWithMentions({
  value,
  onChange,
  onSubmit,
  placeholder = "Write a comment...",
  disabled,
  isSubmitting,
  orgMembers,
  currentUserId,
  textareaRef,
  className,
  textareaClassName,
  rows = 2,
}: CommentInputWithMentionsProps) {
  const [mentionedUserIds, setMentionedUserIds] = React.useState<string[]>([]);
  const [mentionHighlightIndex, setMentionHighlightIndex] = React.useState(0);
  const [cursorPos, setCursorPos] = React.useState(0);
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
  const ref = textareaRef ?? internalRef;

  const mentionState = React.useMemo(
    () => getMentionState(value, cursorPos),
    [value, cursorPos]
  );

  const filteredMembers = React.useMemo(() => {
    if (!mentionState) return [];
    const { query } = mentionState;
    return orgMembers
      .filter((m) => m.userId !== currentUserId)
      .filter((m) => {
        const name = (m.user?.fullName ?? m.user?.email ?? "").toLowerCase();
        const email = (m.user?.email ?? "").toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 8);
  }, [mentionState, orgMembers, currentUserId]);

  const showMentionDropdown = mentionState !== null && filteredMembers.length > 0;

  React.useEffect(() => {
    if (!showMentionDropdown) setMentionHighlightIndex(0);
  }, [showMentionDropdown]);

  const insertMention = React.useCallback(
    (member: OrgMember) => {
      const ta = ref.current;
      if (!ta || !mentionState) return;
      const displayName = member.user?.fullName ?? member.user?.email ?? "User";
      const before = value.slice(0, mentionState.startIndex);
      const after = value.slice(mentionState.startIndex + 1 + mentionState.query.length);
      const newText = `${before}@${displayName} ${after}`;
      const newMentionedIds = mentionedUserIds.includes(member.userId)
        ? mentionedUserIds
        : [...mentionedUserIds, member.userId];
      setMentionedUserIds(newMentionedIds);
      onChange(newText, newMentionedIds);
      setTimeout(() => {
        ta.focus();
        const pos = mentionState.startIndex + displayName.length + 2; // @ + name + space
        ta.setSelectionRange(pos, pos);
        setCursorPos(pos);
      }, 0);
    },
    [value, mentionState, onChange, mentionedUserIds, ref]
  );

  const doSubmit = React.useCallback(() => {
    if (value.trim()) {
      onSubmit(value.trim(), mentionedUserIds);
      setMentionedUserIds([]);
    }
  }, [value, mentionedUserIds, onSubmit]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMentionDropdown) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionHighlightIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionHighlightIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" && filteredMembers.length > 0) {
          e.preventDefault();
          insertMention(filteredMembers[mentionHighlightIndex]);
          return;
        }
        if (e.key === "Escape") {
          // Will close via mentionState becoming null when they delete @
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        doSubmit();
      }
    },
    [showMentionDropdown, filteredMembers, mentionHighlightIndex, insertMention, doSubmit]
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setCursorPos(e.target.selectionStart ?? v.length);
      onChange(v, mentionedUserIds);
    },
    [onChange, mentionedUserIds]
  );

  const handleSelect = React.useCallback(() => {
    const ta = ref.current;
    if (ta) setCursorPos(ta.selectionStart);
  }, [ref]);

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelect}
        disabled={disabled}
        rows={rows}
        className={cn(
          "min-h-[80px] max-h-[240px] resize-none overflow-y-auto pr-2",
          textareaClassName
        )}
        aria-label="Comment text"
      />
      {showMentionDropdown && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-64 max-h-48 overflow-y-auto rounded-xl border-0 bg-popover p-1 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] ring-1 ring-border/40 animate-in fade-in-0 zoom-in-95 dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5)]"
          role="listbox"
        >
          <div className="border-b border-border/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Mention a member
          </div>
          {filteredMembers.map((m, i) => {
            const displayName = m.user?.fullName ?? m.user?.email ?? "User";
            const isHighlighted = i === mentionHighlightIndex;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors",
                  isHighlighted ? "bg-accent" : "hover:bg-muted/50"
                )}
                onMouseEnter={() => setMentionHighlightIndex(i)}
                onClick={() => insertMention(m)}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {(m.user?.fullName ?? m.user?.email ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 truncate">
                  <span className="font-medium">{displayName}</span>
                  {m.user?.email && (
                    <span className="block text-xs text-muted-foreground truncate">{m.user.email}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
