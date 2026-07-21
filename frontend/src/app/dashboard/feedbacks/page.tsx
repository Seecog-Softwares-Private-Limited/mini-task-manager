"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchFeedbacks, openFeedbackMedia } from "@/services/api/feedbacks.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListPagination } from "@/components/ui/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollablePageLayout } from "@/components/dashboard/scrollable-page-layout";
import { FeedbackTriggerButton } from "@/components/feedbacks/feedback-trigger-button";
import { formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function FeedbacksPage() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["feedbacks", "list", page, pageSize],
    queryFn: () => fetchFeedbacks(page, pageSize),
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

  return (
    <ScrollablePageLayout
      header={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Sparkles className="h-6 w-6 text-violet-500" />
              Feedbacks
            </h1>
            <p className="mt-1 text-muted-foreground">
              Submitted feedback from your workspace. Also available at{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/feedbacks</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <FeedbackTriggerButton showLabel />
          </div>
        </div>
      }
    >
      {listLoading ? (
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
                Use the premium sparkles icon in the header to submit the first one.
              </p>
            </div>
            <FeedbackTriggerButton showLabel />
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
                    {formatRelativeTime(item.createdAt) ||
                      new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.authorName ?? "Unknown"} · {new Date(item.createdAt).toLocaleString()}
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
                            void openFeedbackMedia(item.id, media.id, media.fileName)
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
    </ScrollablePageLayout>
  );
}
