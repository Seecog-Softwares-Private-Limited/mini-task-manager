"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isNetworkError } from "@/lib/error";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/api/notifications.api";
import type { Notification } from "@/types/api";

const REFETCH_INTERVAL_MS = 15_000; // Real-time polling every 15 seconds

/** Local system notification (trial, limit) - merged with API notifications */
export type SystemNotification = Notification & { id: string; _local?: true };

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refetch: () => void;
  addNotification?: (n: { title: string; message: string }) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [localAlerts, setLocalAlerts] = useState<SystemNotification[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(1, 50),
    enabled: isAuthenticated,
    refetchInterval: (query) => (isNetworkError(query.state.error) ? false : REFETCH_INTERVAL_MS),
    staleTime: 5 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setLocalAlerts((prev) => prev.map((n) => ({ ...n, isRead: true })));
    },
  });

  const apiNotifications = data?.data ?? [];
  const mergedNotifications = useMemo(() => {
    const combined = [...apiNotifications, ...localAlerts];
    return combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [apiNotifications, localAlerts]);

  const unreadCount = useMemo(
    () => mergedNotifications.filter((n) => !n.isRead).length,
    [mergedNotifications]
  );

  const markRead = useCallback(
    (id: string) => {
      const isLocal = localAlerts.some((n) => n.id === id);
      if (isLocal) {
        setLocalAlerts((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      } else {
        markReadMutation.mutate(id);
      }
    },
    [localAlerts, markReadMutation]
  );

  const markAllRead = useCallback(() => {
    setLocalAlerts((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const addNotification = useCallback(
    (n: { title: string; message: string }) => {
      const item: SystemNotification = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId: "",
        title: n.title,
        message: n.message,
        isRead: false,
        createdAt: new Date().toISOString(),
        _local: true,
      };
      setLocalAlerts((prev) => [item, ...prev].slice(0, 10));
    },
    []
  );

  const value = useMemo(
    () => ({
      notifications: mergedNotifications,
      unreadCount,
      isLoading,
      markRead,
      markAllRead,
      refetch,
      addNotification,
    }),
    [mergedNotifications, unreadCount, isLoading, markRead, markAllRead, refetch, addNotification]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
