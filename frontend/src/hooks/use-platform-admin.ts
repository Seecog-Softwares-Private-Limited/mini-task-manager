"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUserProfile } from "@/services/api/users.api";

export function usePlatformAdmin() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", "me", "platform-admin"],
    queryFn: fetchCurrentUserProfile,
    staleTime: 60_000,
  });

  return {
    isPlatformAdmin: Boolean(data?.isPlatformAdmin),
    isLoading,
    isError,
  };
}
