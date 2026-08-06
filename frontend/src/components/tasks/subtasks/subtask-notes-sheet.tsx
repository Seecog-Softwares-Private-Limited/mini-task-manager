"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOrgRole } from "@/hooks/use-org-role";
import { parseApiError } from "@/services/api/client";
import {
  addSubtaskComment,
  deleteSubtaskComment,
  fetchSubtaskComments,
  updateSubtaskComment,
} from "@/services/api/comments.api";
import {
  deleteEntityAttachment,
  downloadEntityAttachment,
  fetchEntityAttachmentBlob,
  fetchEntityAttachmentPreviewBlob,
  fetchEntityAttachments,
  uploadEntityAttachment,
} from "@/services/api/entity-attachments.api";
import { getSubtaskAssigneeIds } from "@/lib/subtask-assignees";
import {
  createLocalPreviewUrl,
  ensurePreviewBlob,
  getAttachmentFileIcon,
  isAudioMime,
  isImageMime,
} from "@/lib/attachment-file-meta";
import { getClipboardImageFile, validateTaskPasteImageFile } from "@/lib/task-clipboard-image";
import { normalizePastedScreenshotFile } from "@/lib/screenshot-filename";
import { generateClientId } from "@/lib/generate-client-id";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { EntityAttachment, SubtaskComment, TaskSubtask } from "@/types/api";
import type { PendingSubtaskAttachment } from "@/components/tasks/subtasks/subtask-attachments-section";
import {
  AttachmentPreviewModal,
  type AttachmentPreviewTarget,
} from "@/components/tasks/subtasks/attachment-preview-modal";
import { VoiceNotePlayer } from "@/components/tasks/voice-note-player";
import {
  Download,
  MessageSquare,
  Mic,
  Paperclip,
  Pencil,
  Reply,
  Trash2,
  X,
} from "lucide-react";

const MAX_BODY = 2000;
const MAX_REPLY_DEPTH = 7;

type PendingNoteAttachment = PendingSubtaskAttachment;

function normalizeUserId(id: string | null | undefined): string {
  return (id ?? "").trim().toLowerCase();
}

function latestRootPreview(roots: SubtaskComment[]): string | null {
  if (!roots.length) return null;
  const sorted = [...roots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const body = sorted[0]?.body?.trim();
  return body || "Attachment";
}

function sortRootsNewestFirst(nodes: SubtaskComment[]): SubtaskComment[] {
  return [...nodes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function sortRepliesOldestFirst(nodes: SubtaskComment[]): SubtaskComment[] {
  return [...nodes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function collectCommentIds(nodes: SubtaskComment[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.replies?.length) ids.push(...collectCommentIds(node.replies));
  }
  return ids;
}

async function loadCommentAttachments(
  commentIds: string[],
  taskId: string
): Promise<Record<string, EntityAttachment[]>> {
  const entries = await Promise.all(
    commentIds.map(async (id) => {
      try {
        const items = await fetchEntityAttachments("SUBTASK_COMMENT", id, taskId);
        return [id, items] as const;
      } catch {
        return [id, [] as EntityAttachment[]] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

function CommentAttachmentGallery({
  attachments,
  canDelete,
  disabled,
  onPreview,
  onDelete,
}: {
  attachments: EntityAttachment[];
  canDelete?: boolean;
  disabled?: boolean;
  onPreview: (target: AttachmentPreviewTarget) => void;
  onDelete?: (attachmentId: string) => void;
}) {
  const [mediaUrlById, setMediaUrlById] = React.useState<Record<string, string>>({});
  const attachmentKey = React.useMemo(
    () => attachments.map((a) => a.id).join(","),
    [attachments]
  );

  React.useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];

    void (async () => {
      const next: Record<string, string> = {};
      for (const attachment of attachments) {
        const isImage = isImageMime(attachment.mimeType, attachment.originalFileName);
        const isAudio = isAudioMime(attachment.mimeType, attachment.originalFileName);
        if (!isImage && !isAudio) continue;
        try {
          const raw = isImage
            ? await fetchEntityAttachmentPreviewBlob(attachment.id)
            : await fetchEntityAttachmentBlob(attachment.id);
          if (cancelled) return;
          const blob = ensurePreviewBlob(
            raw,
            attachment.mimeType,
            attachment.originalFileName
          );
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[attachment.id] = url;
        } catch {
          /* preview optional */
        }
      }
      if (!cancelled) setMediaUrlById(next);
    })();

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // attachments identity changes often; attachmentKey tracks content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentKey]);

  if (!attachments.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => {
          const isImage = isImageMime(attachment.mimeType, attachment.originalFileName);
          const isAudio = isAudioMime(attachment.mimeType, attachment.originalFileName);
          const mediaUrl = mediaUrlById[attachment.id];
          const { Icon } = getAttachmentFileIcon(
            attachment.mimeType,
            attachment.originalFileName
          );

              if (isImage) {
            return (
              <div
                key={attachment.id}
                className="group/tile relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted/30 ring-1 ring-border/40"
              >
                <button
                  type="button"
                  className="block h-full w-full appearance-none border-0 bg-transparent p-0 text-left"
                  onClick={() =>
                    onPreview({
                      id: attachment.id,
                      fileName: attachment.originalFileName,
                      mimeType: attachment.mimeType,
                      localPreviewUrl: mediaUrl,
                    })
                  }
                  aria-label={`View ${attachment.originalFileName}`}
                >
                  {mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/40">
                      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                </button>
                {canDelete ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onDelete?.(attachment.id)}
                    className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover/tile:opacity-100 disabled:opacity-50"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            );
          }

          if (isAudio) {
            return (
              <div
                key={attachment.id}
                className="group/tile relative w-full max-w-sm rounded-xl bg-muted/20 p-2 ring-1 ring-border/40"
              >
                {mediaUrl ? (
                  <VoiceNotePlayer src={mediaUrl} compact />
                ) : (
                  <div className="flex h-10 items-center gap-2 px-2 text-xs text-muted-foreground">
                    <Mic className="h-4 w-4 text-primary" aria-hidden />
                    Loading voice note…
                  </div>
                )}
                {canDelete ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onDelete?.(attachment.id)}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover/tile:opacity-100 disabled:opacity-50"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            );
          }

          return (
            <div
              key={attachment.id}
              className="group/tile relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/50"
            >
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-1 appearance-none border-0 bg-transparent"
                onClick={() =>
                  void downloadEntityAttachment(attachment.id, attachment.originalFileName)
                }
                aria-label={`Download ${attachment.originalFileName}`}
                title={attachment.originalFileName}
              >
                <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                <Download className="h-3 w-3 text-muted-foreground/70" aria-hidden />
              </button>
              {canDelete ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDelete?.(attachment.id)}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover/tile:opacity-100 disabled:opacity-50"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type SubtaskNotesCloseResult = {
  hasNotes: boolean;
  latestNotePreview: string | null;
};

interface SubtaskNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  subtask: Pick<TaskSubtask, "id" | "title" | "assigneeId" | "assigneeIds" | "note">;
  onCloseResult?: (result: SubtaskNotesCloseResult) => void;
}

export function SubtaskNotesSheet({
  open,
  onOpenChange,
  taskId,
  subtask,
  onCloseResult,
}: SubtaskNotesSheetProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOwner, isAdmin } = useOrgRole();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [draft, setDraft] = React.useState("");
  const [replyingTo, setReplyingTo] = React.useState<SubtaskComment | null>(null);
  const [editing, setEditing] = React.useState<SubtaskComment | null>(null);
  const [pending, setPending] = React.useState<PendingNoteAttachment[]>([]);
  const [previewTarget, setPreviewTarget] = React.useState<AttachmentPreviewTarget | null>(
    null
  );
  const [attachmentsByComment, setAttachmentsByComment] = React.useState<
    Record<string, EntityAttachment[]>
  >({});

  const subtaskId = subtask.id?.trim() ?? "";
  const queryKey = ["subtask-comments", taskId, subtaskId] as const;
  const legacyAttachmentsKey = ["entity-attachments", "SUBTASK", subtaskId] as const;

  const canModerate = isOwner || isAdmin;
  const currentUserId = normalizeUserId(user?.id);
  const assigneeIds = getSubtaskAssigneeIds(subtask).map(normalizeUserId);
  const canComment =
    canModerate ||
    (currentUserId.length > 0 && assigneeIds.includes(currentUserId));

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => fetchSubtaskComments(taskId, subtaskId),
    enabled: open && !!taskId && !!subtaskId,
  });

  const legacyAttachmentsQuery = useQuery({
    queryKey: legacyAttachmentsKey,
    queryFn: () => fetchEntityAttachments("SUBTASK", subtaskId, taskId),
    enabled: open && !!taskId && !!subtaskId,
    staleTime: 30_000,
  });

  const roots = React.useMemo(() => {
    const raw = commentsQuery.data ?? [];
    const scoped = raw.filter(
      (c) => !c.subtaskId || c.subtaskId === subtaskId || c.subtaskId === ""
    );
    return sortRootsNewestFirst(scoped);
  }, [commentsQuery.data, subtaskId]);

  const commentIdsKey = React.useMemo(
    () => collectCommentIds(roots).join(","),
    [roots]
  );

  React.useEffect(() => {
    if (!open || !taskId || !commentIdsKey) {
      setAttachmentsByComment({});
      return;
    }
    let cancelled = false;
    const ids = commentIdsKey.split(",").filter(Boolean);
    void loadCommentAttachments(ids, taskId).then((map) => {
      if (!cancelled) setAttachmentsByComment(map);
    });
    return () => {
      cancelled = true;
    };
  }, [open, taskId, commentIdsKey]);

  React.useEffect(() => {
    if (!open) {
      setDraft("");
      setReplyingTo(null);
      setEditing(null);
      setPending((prev) => {
        for (const item of prev) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        }
        return [];
      });
      setPreviewTarget(null);
    }
  }, [open]);

  const emitCloseResult = React.useCallback(() => {
    onCloseResult?.({
      hasNotes: roots.length > 0,
      latestNotePreview: latestRootPreview(roots),
    });
  }, [onCloseResult, roots]);

  const handleOpenChange = (next: boolean) => {
    if (!next) emitCloseResult();
    onOpenChange(next);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    void queryClient.invalidateQueries({ queryKey: legacyAttachmentsKey });
  };

  const clearPending = React.useCallback(() => {
    setPending((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
  }, []);

  const addPendingFiles = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const allowed: File[] = [];
      let rejectedAudio = false;
      for (const file of list) {
        if (isAudioMime(file.type, file.name)) {
          rejectedAudio = true;
          continue;
        }
        allowed.push(file);
      }

      if (rejectedAudio) {
        toast({
          title: "Voice notes aren’t supported here",
          description: "Attach an image or file instead.",
          variant: "error",
        });
      }
      if (!allowed.length) return;

      setPending((prev) => {
        const next = [...prev];
        for (const file of allowed) {
          next.push({
            clientId: generateClientId(),
            file,
            previewUrl: createLocalPreviewUrl(file),
          });
        }
        return next;
      });
    },
    [toast]
  );

  const removePending = (clientId: string) => {
    setPending((prev) => {
      const removed = prev.find((p) => p.clientId === clientId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.clientId !== clientId);
    });
  };

  const handleComposerPaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (editing || !canComment) return;
      const image = getClipboardImageFile(event.clipboardData);
      if (!image) return;
      event.preventDefault();
      const err = validateTaskPasteImageFile(image);
      if (err) {
        toast({ title: "Paste failed", description: err, variant: "error" });
        return;
      }
      addPendingFiles([normalizePastedScreenshotFile(image)]);
    },
    [addPendingFiles, canComment, editing, toast]
  );

  const postMutation = useMutation({
    mutationFn: async () => {
      const body = draft.trim();
      if (!body && (editing || pending.length === 0)) {
        throw new Error("Add a comment or attach a file");
      }
      if (editing) {
        return {
          comment: await updateSubtaskComment(taskId, subtaskId, editing.id, body),
          uploaded: [] as EntityAttachment[],
        };
      }
      const comment = await addSubtaskComment(
        taskId,
        subtaskId,
        body || "",
        replyingTo?.id ?? null
      );
      const uploaded: EntityAttachment[] = [];
      for (const item of pending) {
        uploaded.push(
          await uploadEntityAttachment("SUBTASK_COMMENT", comment.id, item.file, taskId)
        );
      }
      return { comment, uploaded };
    },
    onSuccess: ({ comment, uploaded }) => {
      if (uploaded.length) {
        setAttachmentsByComment((prev) => ({
          ...prev,
          [comment.id]: uploaded,
        }));
      }
      setDraft("");
      setReplyingTo(null);
      setEditing(null);
      clearPending();
      invalidate();
    },
    onError: (err) => {
      toast({
        title: editing ? "Could not update comment" : "Could not post comment",
        description: err instanceof Error ? err.message : parseApiError(err),
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteSubtaskComment(taskId, subtaskId, commentId),
    onSuccess: (_data, commentId) => {
      if (editing?.id === commentId) setEditing(null);
      if (replyingTo?.id === commentId) setReplyingTo(null);
      setAttachmentsByComment((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      invalidate();
    },
    onError: (err) => {
      toast({
        title: "Could not delete comment",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({
      attachmentId,
      commentId,
    }: {
      attachmentId: string;
      commentId?: string;
    }) => {
      await deleteEntityAttachment(attachmentId);
      return { attachmentId, commentId };
    },
    onSuccess: ({ attachmentId, commentId }) => {
      if (commentId) {
        setAttachmentsByComment((prev) => ({
          ...prev,
          [commentId]: (prev[commentId] ?? []).filter((a) => a.id !== attachmentId),
        }));
      }
      void queryClient.invalidateQueries({ queryKey: legacyAttachmentsKey });
    },
    onError: (err) => {
      toast({
        title: "Could not delete attachment",
        description: parseApiError(err),
        variant: "error",
      });
    },
  });

  const startEdit = (comment: SubtaskComment) => {
    setEditing(comment);
    setReplyingTo(null);
    setDraft(comment.body);
    clearPending();
  };

  const startReply = (comment: SubtaskComment) => {
    setReplyingTo(comment);
    setEditing(null);
    setDraft("");
  };

  const cancelComposerMode = () => {
    setReplyingTo(null);
    setEditing(null);
    setDraft("");
    clearPending();
  };

  const title = subtask.title?.trim() || "Checklist item";
  const legacyAttachments = legacyAttachmentsQuery.data ?? [];
  const busy = postMutation.isPending || deleteMutation.isPending;
  const canAttach = canComment && !editing && !!subtaskId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-xl"
        onPaste={(e) => {
          if (!canAttach || busy) return;
          handleComposerPaste(e);
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border/50 px-5 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Comments
          </DialogTitle>
          <DialogDescription className="truncate text-sm">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!subtaskId ? (
            <p className="text-sm text-muted-foreground">
              Save this checklist item before adding comments.
            </p>
          ) : commentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading comments…</p>
          ) : commentsQuery.isError ? (
            <p className="text-sm text-destructive">
              {parseApiError(commentsQuery.error)}
            </p>
          ) : (
            <div className="space-y-4">
              {legacyAttachments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Earlier files
                  </p>
                  <CommentAttachmentGallery
                    attachments={legacyAttachments}
                    canDelete={canModerate}
                    disabled={deleteAttachmentMutation.isPending}
                    onPreview={setPreviewTarget}
                    onDelete={(attachmentId) =>
                      deleteAttachmentMutation.mutate({ attachmentId })
                    }
                  />
                </div>
              ) : null}

              {roots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comments yet. Add a note with an image or file below.
                </p>
              ) : (
                <ul className="space-y-4">
                  {roots.map((root) => (
                    <CommentNode
                      key={root.id}
                      comment={root}
                      depth={0}
                      currentUserId={currentUserId}
                      canModerate={canModerate}
                      canComment={canComment}
                      busy={busy || deleteAttachmentMutation.isPending}
                      attachmentsByComment={attachmentsByComment}
                      onReply={startReply}
                      onEdit={startEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onPreview={setPreviewTarget}
                      onDeleteAttachment={(attachmentId, commentId) =>
                        deleteAttachmentMutation.mutate({ attachmentId, commentId })
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/50 bg-muted/20 px-5 py-3">
          {!canComment ? (
            <p className="text-xs text-muted-foreground">
              Only workspace owners/admins or people assigned to this checklist
              item can add comments.
            </p>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const canSubmit =
                  Boolean(draft.trim()) || (!editing && pending.length > 0);
                if (!canSubmit || postMutation.isPending) return;
                postMutation.mutate();
              }}
            >
              {replyingTo || editing ? (
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                  <span className="truncate">
                    {editing
                      ? "Editing comment"
                      : `Replying to ${replyingTo?.user?.fullName || "comment"}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={cancelComposerMode}
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}

              {pending.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pending.map((item) => {
                    const { Icon } = getAttachmentFileIcon(
                      item.file.type,
                      item.file.name
                    );
                    const showThumb =
                      isImageMime(item.file.type, item.file.name) && item.previewUrl;
                    return (
                      <div
                        key={item.clientId}
                        className="group/tile relative h-16 w-16 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/50 shadow-sm"
                      >
                        {showThumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removePending(item.clientId)}
                          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50"
                          aria-label="Remove attachment"
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
                placeholder={
                  editing
                    ? "Update your comment…"
                    : replyingTo
                      ? "Write a reply…"
                      : "Write a comment…"
                }
                rows={3}
                disabled={postMutation.isPending || !subtaskId}
                className="min-h-[72px] resize-y text-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.json,application/pdf"
                    className="hidden"
                    disabled={!canAttach || busy}
                    onChange={(e) => {
                      if (e.target.files?.length) addPendingFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px]"
                    disabled={!canAttach || busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attach
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    {draft.length}/{MAX_BODY}
                  </span>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    postMutation.isPending ||
                    !subtaskId ||
                    (!draft.trim() && (!!editing || pending.length === 0))
                  }
                >
                  {postMutation.isPending
                    ? "Saving…"
                    : editing
                      ? "Save"
                      : replyingTo
                        ? "Reply"
                        : "Comment"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <AttachmentPreviewModal
          target={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CommentNode({
  comment,
  depth,
  currentUserId,
  canModerate,
  canComment,
  busy,
  attachmentsByComment,
  onReply,
  onEdit,
  onDelete,
  onPreview,
  onDeleteAttachment,
}: {
  comment: SubtaskComment;
  depth: number;
  currentUserId: string;
  canModerate: boolean;
  canComment: boolean;
  busy: boolean;
  attachmentsByComment: Record<string, EntityAttachment[]>;
  onReply: (c: SubtaskComment) => void;
  onEdit: (c: SubtaskComment) => void;
  onDelete: (id: string) => void;
  onPreview: (target: AttachmentPreviewTarget) => void;
  onDeleteAttachment: (attachmentId: string, commentId: string) => void;
}) {
  const isAuthor = normalizeUserId(comment.userId) === currentUserId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || canModerate;
  const replies = sortRepliesOldestFirst(comment.replies ?? []);
  const name = comment.user?.fullName || comment.user?.email || "User";
  const attachments = attachmentsByComment[comment.id] ?? [];

  return (
    <li className={cn(depth > 0 && "ml-4 border-l border-border/40 pl-3")}>
      <div className="flex gap-2.5">
        <UserAvatar
          userId={comment.userId}
          name={name}
          avatarUrl={comment.user?.avatarUrl}
          className="mt-0.5 h-7 w-7 shrink-0"
          fallbackClassName="text-[10px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          {comment.body.trim() ? (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">
              {comment.body}
            </p>
          ) : null}
          {attachments.length > 0 ? (
            <CommentAttachmentGallery
              attachments={attachments}
              canDelete={isAuthor || canModerate}
              disabled={busy}
              onPreview={onPreview}
              onDelete={(attachmentId) => onDeleteAttachment(attachmentId, comment.id)}
            />
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {canComment && depth < MAX_REPLY_DEPTH ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                disabled={busy}
                onClick={() => onReply(comment)}
              >
                <Reply className="h-3 w-3" />
                Reply
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                disabled={busy}
                onClick={() => onEdit(comment)}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Delete this comment?")) {
                    onDelete(comment.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {replies.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              canModerate={canModerate}
              canComment={canComment}
              busy={busy}
              attachmentsByComment={attachmentsByComment}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onPreview={onPreview}
              onDeleteAttachment={onDeleteAttachment}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
