"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarCropDialog } from "@/components/dashboard/avatar-crop-dialog";
import { useToast } from "@/components/ui/use-toast";
import { deleteMyAvatar, uploadMyAvatar } from "@/services/api/users.api";
import { parseApiError } from "@/services/api/client";
import { cn } from "@/lib/utils";
import type { LoginResponse } from "@/types/api";

type AuthUser = LoginResponse["user"];

const sizeClasses = {
  sm: { avatar: "h-7 w-7", fallback: "text-[10px]", cam: "h-5 w-5", camIcon: "h-3 w-3" },
  md: { avatar: "h-9 w-9", fallback: "text-xs", cam: "h-5 w-5", camIcon: "h-3 w-3" },
  sidebar: { avatar: "h-10 w-10", fallback: "text-xs", cam: "h-6 w-6", camIcon: "h-3 w-3" },
  /** Sidebar / hero profile — large with premium frame */
  lg: { avatar: "h-[4.75rem] w-[4.75rem]", fallback: "text-xl", cam: "h-8 w-8", camIcon: "h-4 w-4" },
} as const;

export function DashboardProfileAvatar({
  user,
  mergeUser,
  size = "sm",
}: {
  user: AuthUser;
  mergeUser: (partial: Partial<AuthUser>) => void;
  /** Header uses `lg` for a more prominent profile control */
  size?: keyof typeof sizeClasses;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const sz = sizeClasses[size];

  useEffect(() => {
    return () => {
      if (cropImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrc);
      }
    };
  }, [cropImageSrc]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image file", variant: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be 5 MB or smaller", variant: "error" });
      return;
    }
    setOpen(false);
    if (cropImageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }

  async function uploadCroppedFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Cropped image must be 2 MB or smaller", variant: "error" });
      return;
    }
    setUploading(true);
    try {
      const updated = await uploadMyAvatar(file);
      const url = updated.avatarUrl;
      mergeUser({
        fullName: updated.fullName,
        avatarUrl: url ? `${url.split("?")[0]}?t=${Date.now()}` : undefined,
      });
      toast({ title: "Profile photo updated", variant: "success" });
      if (cropImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrc);
      }
      setCropImageSrc(null);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: parseApiError(err),
        variant: "error",
      });
      throw err;
    } finally {
      setUploading(false);
    }
  }

  function onCropOpenChange(next: boolean) {
    setCropOpen(next);
    if (!next && cropImageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  }

  async function onRemove() {
    setOpen(false);
    setUploading(true);
    try {
      await deleteMyAvatar();
      mergeUser({ avatarUrl: undefined });
      toast({ title: "Profile photo removed", variant: "success" });
    } catch (err) {
      toast({
        title: "Could not remove photo",
        description: parseApiError(err),
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden
        onChange={onFileChange}
      />
      <AvatarCropDialog
        open={cropOpen}
        imageSrc={cropImageSrc}
        onOpenChange={onCropOpenChange}
        onConfirm={uploadCroppedFile}
        isUploading={uploading}
      />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="group/avatar relative h-auto rounded-full p-0 hover:bg-transparent"
            disabled={uploading}
            title="Profile photo"
            aria-label="Profile photo menu"
          >
            <span
              className={cn(
                "inline-flex rounded-full transition-[box-shadow,filter] duration-200",
                size === "lg"
                  ? cn(
                      "bg-gradient-to-br from-primary/55 via-violet-500/40 to-indigo-600/50 p-[3px]",
                      "shadow-[0_4px_16px_-4px_rgba(99,102,241,0.45),0_0_0_1px_rgba(255,255,255,0.12)_inset]",
                      "dark:from-primary/45 dark:via-violet-400/35 dark:to-indigo-500/45",
                      "dark:shadow-[0_6px_22px_-6px_rgba(0,0,0,0.55)]",
                      "group-hover/avatar:shadow-[0_6px_22px_-4px_rgba(99,102,241,0.5),0_0_0_1px_rgba(255,255,255,0.18)_inset]",
                      "group-hover/avatar:brightness-[1.02]"
                    )
                  : size === "sidebar"
                    ? "ring-2 ring-violet-500/15 group-hover/avatar:ring-violet-500/25"
                    : "ring-2 ring-transparent group-hover/avatar:ring-primary/30"
              )}
            >
              <Avatar
                className={cn(
                  "rounded-full transition-[box-shadow] duration-200",
                  sz.avatar,
                  size === "lg"
                    ? "border-[3px] border-white shadow-inner dark:border-background ring-1 ring-black/[0.06] dark:ring-white/10"
                    : ""
                )}
              >
                <AvatarImage src={user.avatarUrl} alt="" className="object-cover" />
                <AvatarFallback className={cn("font-bold rounded-full gradient-bg text-white", sz.fallback)}>
                  {(user.fullName ?? user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
            <span
              className={cn(
                "absolute flex items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-md dark:border-background",
                size === "lg" ? "-bottom-0 -right-0" : size === "sidebar" ? "-bottom-0.5 -right-0.5" : "-bottom-0.5 -right-0.5",
                sz.cam
              )}
            >
              <Camera className={cn(sz.camIcon)} aria-hidden />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onSelect={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <span className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Upload profile photo</span>
              <span className="text-xs font-normal text-muted-foreground">
                JPG, PNG, WebP or GIF · crop before save
              </span>
            </span>
          </DropdownMenuItem>
          {user.avatarUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void onRemove()}
                disabled={uploading}
                className="text-destructive focus:text-destructive"
              >
                <span className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 className="h-5 w-5" aria-hidden />
                </span>
                Remove photo
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
