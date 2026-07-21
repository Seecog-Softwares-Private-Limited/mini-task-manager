"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ClipboardPaste,
  FileUp,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createFeedback } from "@/services/api/feedbacks.api";
import {
  getClipboardImageFile,
  normalizePastedImageFile,
  validateTaskPasteImageFile,
} from "@/lib/task-clipboard-image";
import { normalizeApiError } from "@/lib/error";

type FeedbackFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackFormDialog({ open, onOpenChange }: FeedbackFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setFiles([]);
  }, []);

  const mutation = useMutation({
    mutationFn: createFeedback,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast({ title: "Feedback submitted", variant: "success" });
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      toast({
        title: "Could not submit feedback",
        description: normalized.message,
        variant: "destructive",
      });
    },
  });

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    setFiles((prev) => {
      const merged = [...prev];
      for (const file of next) {
        if (merged.length >= 5) break;
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} must be 10MB or smaller.`,
            variant: "destructive",
          });
          continue;
        }
        merged.push(file);
      }
      return merged;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePasteMedia = async () => {
    try {
      if (navigator.clipboard && "read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = normalizePastedImageFile(
              new File([blob], `clipboard-${Date.now()}.png`, { type: blob.type || "image/png" })
            );
            const err = validateTaskPasteImageFile(file);
            if (err) {
              toast({ title: "Invalid clipboard image", description: err, variant: "destructive" });
              return;
            }
            addFiles([file]);
            toast({ title: "Clipboard image attached" });
            return;
          }
        }
      }
      toast({
        title: "No image in clipboard",
        description: "Copy a screenshot, then try again — or paste (Ctrl/Cmd+V) into the form.",
      });
    } catch {
      toast({
        title: "Clipboard unavailable",
        description: "Paste a screenshot with Ctrl/Cmd+V, or upload a file.",
      });
    }
  };

  const handleFormPaste = (event: React.ClipboardEvent) => {
    const image = getClipboardImageFile(event.clipboardData);
    if (!image) return;
    event.preventDefault();
    const file = normalizePastedImageFile(image);
    const err = validateTaskPasteImageFile(file);
    if (err) {
      toast({ title: "Invalid clipboard image", description: err, variant: "destructive" });
      return;
    }
    addFiles([file]);
    toast({ title: "Clipboard image attached" });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) {
      toast({
        title: "Missing fields",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({
      title: trimmedTitle,
      description: trimmedDescription,
      files,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !mutation.isPending) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onPaste={handleFormPaste}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            Send feedback
          </DialogTitle>
          <DialogDescription>
            Share a title, details, and optional screenshots or files. Paste images with Ctrl/Cmd+V.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="feedback-title">Title</Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
              maxLength={255}
              disabled={mutation.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-description">Description</Label>
            <Textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What would you like improved?"
              rows={5}
              maxLength={10000}
              disabled={mutation.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Media</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutation.isPending || files.length >= 5}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="mr-1.5 h-4 w-4" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutation.isPending || files.length >= 5}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="mr-1.5 h-4 w-4" />
                Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mutation.isPending || files.length >= 5}
                onClick={() => void handlePasteMedia()}
              >
                <ClipboardPaste className="mr-1.5 h-4 w-4" />
                Clipboard
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.json"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeFile(index)}
                      disabled={mutation.isPending}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Up to 5 files, 10MB each.</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-1.5">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
