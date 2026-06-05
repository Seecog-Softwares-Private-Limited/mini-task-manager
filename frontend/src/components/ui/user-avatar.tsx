"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarSrcCandidates, getAvatarInitials } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  userId?: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  userId,
  className,
  fallbackClassName,
  imageClassName,
}: UserAvatarProps) {
  const candidates = useMemo(
    () => avatarSrcCandidates(avatarUrl, userId, name),
    [avatarUrl, userId, name],
  );
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  return (
    <Avatar className={cn("shrink-0", className)}>
      {src ? (
        <AvatarImage
          key={src}
          src={src}
          alt=""
          className={cn("object-cover", imageClassName)}
          referrerPolicy="no-referrer"
          onLoadingStatusChange={(status) => {
            if (status === "error" && index < candidates.length - 1) {
              setIndex((i) => i + 1);
            }
          }}
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>
        {getAvatarInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
