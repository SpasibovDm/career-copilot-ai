"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { AdminHealth, AdminQueue, AdminUsersResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatNumber } from "@/lib/formatters";

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const usersQuery = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => apiFetch<AdminUsersResponse>(`/admin/users?page=${page}&page_size=10`),
  });

  const healthQuery = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => apiFetch<AdminHealth>("/admin/health"),
  });

  const queueQuery = useQuery({
    queryKey: ["admin-queue"],
    queryFn: () => apiFetch<AdminQueue>("/admin/jobs/queue"),
  });

  const totalPages = usersQuery.data ? Math.max(1, Math.ceil(usersQuery.data.total / usersQuery.data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("health.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {healthQuery.isLoading ? (
              <Skeleton className="h-20" />
            ) : healthQuery.isError ? (
              <p className="text-sm text-muted-foreground">{t("health.error")}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("health.queueSize")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, healthQuery.data.queue_size)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.workers")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, healthQuery.data.workers)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.lastHeartbeat")}</span>
                  <span className="font-medium">
                    {formatDateTime(locale, healthQuery.data.last_worker_heartbeat) ?? t("health.never")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("queue.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {queueQuery.isLoading ? (
              <Skeleton className="h-20" />
            ) : queueQuery.isError ? (
              <p className="text-sm text-muted-foreground">{t("queue.error")}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("queue.count")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, queueQuery.data.count)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t("queue.hint")}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("users.summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <Skeleton className="h-20" />
            ) : usersQuery.isError ? (
              <p className="text-sm text-muted-foreground">{t("users.error")}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("users.total")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, usersQuery.data.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("users.page")}</span>
                  <span className="font-medium">
                    {t("users.pageValue", { page: usersQuery.data.page, total: totalPages })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("users.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : usersQuery.isError ? (
            <p className="text-sm text-muted-foreground">{t("users.error")}</p>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("users.columns.email")}</TableHead>
                    <TableHead>{t("users.columns.createdAt")}</TableHead>
                    <TableHead className="text-right">{t("users.columns.documents")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersQuery.data.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{formatDateTime(locale, user.created_at)}</TableCell>
                      <TableCell className="text-right">{formatNumber(locale, user.documents_count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between text-sm">
                <span>{t("users.pageValue", { page: usersQuery.data.page, total: totalPages })}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    {t("users.previous")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    {t("users.next")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
