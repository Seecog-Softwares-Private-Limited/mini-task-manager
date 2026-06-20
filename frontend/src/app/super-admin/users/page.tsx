"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchSuperAdminUsers, setSuperAdminUserActive } from "@/services/api/super-admin.api";

const SEARCH_DEBOUNCE_MS = 400;

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["super-admin", "users", debouncedSearch],
    queryFn: ({ signal }) =>
      fetchSuperAdminUsers(
        { search: debouncedSearch || undefined },
        signal
      ),
    retry: false,
    staleTime: 30_000,
  });

  async function toggle(id: string, status: string) {
    await setSuperAdminUserActive(id, status !== "ACTIVE");
    await refetch();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading || (isFetching && !data) ? (
        <p className="text-sm text-muted-foreground">Loading users...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Tenant</th>
                <th className="p-2">Status</th>
                <th className="p-2">Last Login</th>
                <th className="p-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((u: any) => (
                <tr className="border-t" key={u.id}>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role ?? "-"}</td>
                  <td className="p-2">{u.tenant ?? "-"}</td>
                  <td className="p-2">{u.status}</td>
                  <td className="p-2">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
                  <td className="p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => void toggle(u.id, u.status)}>
                      {u.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
