"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotificationsOptional } from "@/context/notifications-context";
import { useAuth } from "@/hooks/use-auth";
import { isNetworkError } from "@/lib/error";
import { fetchNotifications } from "@/services/api/notifications.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/ui/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";

const REFETCH_INTERVAL_MS = 15_000;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const ctx = useNotificationsOptional();
  const { markRead, markAllRead } = ctx ?? {};
  const hasUnread = (ctx?.unreadCount ?? 0) > 0;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["notifications", "list", page, pageSize],
    queryFn: () => fetchNotifications(page, pageSize),
    enabled: isAuthenticated,
    refetchInterval: (query) => (isNetworkError(query.state.error) ? false : REFETCH_INTERVAL_MS),
    staleTime: 5 * 1000,
  });

  const notifications = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const handleRefresh = useCallback(() => {
    void refetch();
    ctx?.refetch();
  }, [ctx, refetch]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  if (!ctx) {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <div className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const listLoading = isLoading && notifications.length === 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted-foreground">
            Your notifications. Updates every 15 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {hasUnread && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead?.()}
              aria-label="Mark all as read"
            >
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-semibold">All caught up!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New notifications will show up here when you&apos;re assigned to tasks, mentioned in comments, and more.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full px-4 py-4 text-left transition-colors hover:bg-muted/30 ${
                        !n.isRead ? "border-l-4 border-l-primary bg-primary/5" : ""
                      }`}
                      onClick={() => markRead?.(n.id)}
                    >
                      <p className="text-sm font-semibold">{n.title ?? "Notification"}</p>
                      {n.message && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {n.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <ListPagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                className="mt-4"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
