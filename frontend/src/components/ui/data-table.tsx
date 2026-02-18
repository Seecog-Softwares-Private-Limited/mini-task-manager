"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sort?: { key: keyof T | string; direction: SortDirection };
  onSortChange?: (key: keyof T | string, direction: SortDirection) => void;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (key: string, value: string) => void;
  "aria-label"?: string;
  className?: string;
}

const defaultPageSizeOptions = [10, 25, 50];

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sort: controlledSort,
  onSortChange,
  totalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = defaultPageSizeOptions,
  isLoading,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  columnFilters = {},
  onColumnFilterChange,
  "aria-label": ariaLabel = "Data table",
  className,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<{ key: keyof T | string; direction: SortDirection } | null>(null);
  const sort = controlledSort ?? internalSort;
  const setSort = useMemo(() => {
    if (onSortChange) {
      return (key: keyof T | string, direction: SortDirection) => onSortChange(key, direction);
    }
    return (key: keyof T | string, direction: SortDirection) =>
      setInternalSort((prev) =>
        prev?.key === key && prev.direction === direction ? null : { key, direction }
      );
  }, [onSortChange]);

  const totalPages = totalCount != null && totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
  const canPrev = page > 1;
  const canNext = totalCount != null ? page < totalPages : data.length >= pageSize;

  const handleSort = (key: keyof T | string) => {
    const nextDir: SortDirection =
      sort?.key === key && sort.direction === "asc" ? "desc" : "asc";
    setSort(key, nextDir);
  };

  if (isLoading) {
    return (
      <div className={cn("w-full overflow-auto rounded-xl border", className)} aria-busy="true">
        <table className="w-full caption-bottom text-sm" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col) => (
                <th key={String(col.key)} className="h-11 px-4 text-left align-middle">
                  <Skeleton className="h-4 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td key={String(col.key)} className="p-4">
                    <Skeleton className="h-4 w-full max-w-[120px] rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const isReallyEmpty = !data.length && (totalCount == null || totalCount === 0);
  if (isReallyEmpty && !isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      <div className="overflow-auto rounded-xl border" role="region" aria-label={ariaLabel}>
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn("h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground", col.className)}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
                          aria-sort={
                            sort?.key === col.key
                              ? sort.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : undefined
                          }
                        >
                          {col.header}
                          {sort?.key === col.key ? (
                            sort.direction === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-primary" aria-hidden />
                            )
                          ) : (
                            <span className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </div>
                    {col.filterable && onColumnFilterChange && (
                      <Input
                        type="search"
                        placeholder={`Filter...`}
                        value={columnFilters[String(col.key)] ?? ""}
                        onChange={(e) => onColumnFilterChange(String(col.key), e.target.value)}
                        className="h-8 text-xs"
                        aria-label={`Filter by ${col.header}`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="border-b transition-colors hover:bg-muted/20"
              >
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[String(col.key)];
                  const cell = col.render ? col.render(row) : (value as React.ReactNode);
                  return (
                    <td
                      key={String(col.key)}
                      className={cn("px-4 py-3.5 align-middle", col.className)}
                    >
                      {cell ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(totalCount != null || onPageChange) && (totalCount ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {totalCount != null && (
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
            )}
            {onPageSizeChange && pageSizeOptions.length > 1 && (
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-lg border bg-background px-2 text-sm"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!canPrev}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm" aria-live="polite">
              Page {page}{totalPages > 0 ? ` of ${totalPages}` : ""}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!canNext}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
