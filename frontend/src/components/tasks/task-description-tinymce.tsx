"use client";

import * as React from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMceEditorType } from "tinymce";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useTaskDescriptionImagePaste } from "@/hooks/use-task-description-image-paste";
import { TaskDescriptionImagePreviews } from "@/components/tasks/task-description-image-previews";
import {
  getClipboardImageFile,
  normalizePastedImageFile,
} from "@/lib/task-clipboard-image";
import { isTinyMceFocusActive } from "@/lib/tinymce-dialog";

import type { TaskAttachment } from "@/types/api";

const TINYMCE_VERSION = "7.6.1";
const TINYMCE_SCRIPT = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VERSION}/tinymce.min.js`;

export interface TaskDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Called after focus leaves the editor (debounced; cancelled if focus returns, e.g. toolbar). */
  onCommit: () => void;
  onCancel: () => void;
  disabled?: boolean;
  className?: string;
  /** When set, pasted screenshots upload as task attachments. */
  taskId?: string | null;
  /** Persisted image attachments shown under Pasted Images when editing. */
  existingImageAttachments?: TaskAttachment[];
  onAttachmentUploaded?: () => void;
  onPasteError?: (message: string) => void;
}

/**
 * TinyMCE rich-text editor for task descriptions.
 * Loads TinyMCE from jsDelivr; uses GPL license key for open-source use.
 */
export function TaskDescriptionEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  disabled,
  className,
  taskId,
  existingImageAttachments = [],
  onAttachmentUploaded,
  onPasteError,
}: TaskDescriptionEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const blurTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommitRef = React.useRef(onCommit);
  const onCancelRef = React.useRef(onCancel);
  onCommitRef.current = onCommit;
  onCancelRef.current = onCancel;

  const { items, addPastedFile, removeItem } = useTaskDescriptionImagePaste({
    taskId,
    disabled,
    existingAttachments: existingImageAttachments,
    onUploadSuccess: onAttachmentUploaded,
    onError: onPasteError,
  });

  const clearBlurTimer = React.useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  const scheduleCommit = React.useCallback(() => {
    clearBlurTimer();
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      onCommitRef.current();
    }, 320);
  }, [clearBlurTimer]);

  const handleEditorPaste = React.useCallback(
    (editor: TinyMceEditorType, event: ClipboardEvent) => {
      if (disabled) return;
      const rawFile = getClipboardImageFile(event.clipboardData);
      if (!rawFile) return;

      event.preventDefault();
      event.stopPropagation();

      if (!taskId) {
        onPasteError?.("Save the task before pasting screenshots into the description.");
        return;
      }

      const error = addPastedFile(rawFile);
      if (error) return;

      const file = normalizePastedImageFile(rawFile);
      editor.insertContent(
        `<p><em>Pasted image: ${file.name} (added to attachments)</em></p>`
      );
    },
    [disabled, taskId, addPastedFile, onPasteError]
  );

  const init = React.useMemo(
    () => ({
      height: 300,
      min_height: 220,
      menubar: false,
      statusbar: false,
      branding: false,
      promotion: false,
      resize: true,
      skin: isDark ? "oxide-dark" : "oxide",
      content_css: isDark ? "dark" : "default",
      plugins: "lists link autolink code",
      toolbar:
        "undo redo | blocks | bold italic underline strikethrough | bullist numlist | link unlink | removeformat | code",
      block_formats: "Paragraph=p; Heading 2=h2; Heading 3=h3",
      placeholder: "Add description…",
      link_default_target: "_blank",
      link_rel_list: [
        { title: "No referrer", value: "noreferrer noopener" },
        { title: "No follow", value: "nofollow" },
      ],
      content_style: `
        body {
          font-family: var(--font-geist-sans), var(--font-inter), ui-sans-serif, system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.65;
          margin: 12px 14px;
        }
      `,
      setup(editor: TinyMceEditorType) {
        editor.on("blur", () => {
          window.setTimeout(() => {
            if (isTinyMceFocusActive(editor.getContainer())) return;
            scheduleCommit();
          }, 120);
        });
        editor.on("focus", () => {
          clearBlurTimer();
        });
        editor.on("keydown", (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            clearBlurTimer();
            onCancelRef.current();
          }
        });
        editor.on("paste", (e: ClipboardEvent) => {
          void handleEditorPaste(editor, e);
        });
      },
    }),
    [isDark, scheduleCommit, clearBlurTimer, handleEditorPaste]
  );

  React.useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="task-description-editor overflow-hidden rounded-[0.875rem] ring-1 ring-black/[0.06] dark:ring-white/10">
        <Editor
          tinymceScriptSrc={TINYMCE_SCRIPT}
          licenseKey="gpl"
          disabled={disabled}
          value={value}
          onEditorChange={(content) => onChange(content)}
          init={init}
          onInit={(_evt, editor) => {
            window.setTimeout(() => editor.focus(), 0);
          }}
        />
        <p className="border-t border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground/80">
          <kbd className="rounded border border-border/60 bg-background/80 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
          to cancel · Paste screenshots with Ctrl+V / ⌘V · Edits save when you click outside the editor
        </p>
      </div>
      <TaskDescriptionImagePreviews items={items} onRemove={removeItem} />
    </div>
  );
}
