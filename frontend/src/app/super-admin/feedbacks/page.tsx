"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchSuperAdminFeedbacks,
  openSuperAdminFeedbackMedia,
} from "@/services/api/feedbacks.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/ui/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIstDateTime, formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function SuperAdminFeedbacksPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["super-admin", "feedbacks", page, pageSize],
    queryFn: () => fetchSuperAdminFeedbacks(page, pageSize),
    enabled: isAuthenticated,
    staleTime: 5_000,
  });

  const feedbacks = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  useEffect(() => {
    if (page > totalPages) setPage(Math.max(1, totalPages));
  }, [page, totalPages]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const listLoading = isLoading && feedbacks.length === 0;
  const errorMessage =
    error instanceof Error ? error.message : "Failed to load feedbacks";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-violet-500" />
            Feedbacks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feedback submitted by customers across all workspaces.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isError ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-3 py-8 text-center">
            <p className="font-medium text-destructive">Could not load feedbacks</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : listLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-10 w-10 text-violet-400" />
            <div>
              <p className="font-medium">No feedback yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When customers submit feedback from the app, it will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-snug">
                    {item.title}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt) || formatIstDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.organizationName ?? "Unknown workspace"} ·{" "}
                  {item.authorName ?? "Unknown"}
                  {item.authorEmail ? ` (${item.authorEmail})` : ""} ·{" "}
                  {formatIstDateTime(item.createdAt)} IST
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{item.description}</p>
                {item.media?.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {item.media.map((media) => (
                      <li key={media.id}>
                        <button
                          type="button"
                          onClick={() =>
                            void openSuperAdminFeedbackMedia(
                              item.id,
                              media.id,
                              media.fileName
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {media.fileName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
          <ListPagination
            page={page}
            totalCount={totalCount}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
