"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { AdminHealth, AdminMetrics, AdminQueue, AdminUsersResponse, VacancyImportRun, VacancySource } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatNumber } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("rss");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceConfig, setSourceConfig] = useState("");
  const queryClient = useQueryClient();

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

  const metricsQuery = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => apiFetch<AdminMetrics>("/admin/metrics"),
  });

  const sourcesQuery = useQuery({
    queryKey: ["admin-sources"],
    queryFn: () => apiFetch<VacancySource[]>("/admin/vacancy-sources"),
  });

  const importRunsQuery = useQuery({
    queryKey: ["admin-import-runs"],
    queryFn: () => apiFetch<VacancyImportRun[]>("/admin/import-runs"),
  });

  const createSource = useMutation({
    mutationFn: () => {
      let parsedConfig: Record<string, unknown> | undefined;
      if (sourceConfig) {
        try {
          parsedConfig = JSON.parse(sourceConfig) as Record<string, unknown>;
        } catch (error) {
          toast.error(t("sources.form.invalidConfig"));
          throw error;
        }
      }
      return apiFetch<VacancySource>("/admin/vacancy-sources", {
        method: "POST",
        body: JSON.stringify({
          name: sourceName,
          type: sourceType,
          url: sourceUrl,
          config: parsedConfig,
          is_enabled: true,
        }),
      });
    },
    onSuccess: () => {
      setSourceName("");
      setSourceUrl("");
      setSourceConfig("");
      queryClient.invalidateQueries({ queryKey: ["admin-sources"] });
    },
  });

  const runNow = useMutation({
    mutationFn: (sourceId: string) => apiFetch(`/admin/vacancy-sources/${sourceId}/run-now`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-import-runs"] });
    },
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
                <div className="flex justify-between">
                  <span>{t("health.parsingSuccess")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, healthQuery.data.parsing_status_counts.processed ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.parsingFailed")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, healthQuery.data.parsing_status_counts.failed ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.db")}</span>
                  <span className="font-medium">{t(`health.status.${healthQuery.data.db}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.redis")}</span>
                  <span className="font-medium">{t(`health.status.${healthQuery.data.redis}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("health.minio")}</span>
                  <span className="font-medium">{t(`health.status.${healthQuery.data.minio}`)}</span>
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
            <CardTitle>{t("metrics.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsQuery.isLoading ? (
              <Skeleton className="h-20" />
            ) : metricsQuery.isError ? (
              <p className="text-sm text-muted-foreground">{t("metrics.error")}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t("metrics.queueSize")}</span>
                  <span className="font-medium">
                    {formatNumber(locale, metricsQuery.data.queue_size)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("metrics.lastSchedulerRun")}</span>
                  <span className="font-medium">
                    {formatDateTime(locale, metricsQuery.data.last_scheduler_run_at) ?? t("metrics.never")}
                  </span>
                </div>
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

      <Card>
        <CardHeader>
          <CardTitle>{t("sources.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("sources.form.name")}</label>
              <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("sources.form.type")}</label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
              >
                <option value="rss">RSS</option>
                <option value="html">HTML</option>
                <option value="csv_url">CSV URL</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{t("sources.form.url")}</label>
              <Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{t("sources.form.config")}</label>
              <Textarea
                value={sourceConfig}
                onChange={(event) => setSourceConfig(event.target.value)}
                placeholder={t("sources.form.configPlaceholder")}
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => createSource.mutate()}
            disabled={createSource.isPending || !sourceName}
          >
            {createSource.isPending ? t("sources.form.creating") : t("sources.form.create")}
          </Button>

          {sourcesQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : sourcesQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sources.columns.name")}</TableHead>
                  <TableHead>{t("sources.columns.type")}</TableHead>
                  <TableHead>{t("sources.columns.url")}</TableHead>
                  <TableHead>{t("sources.columns.status")}</TableHead>
                  <TableHead className="text-right">{t("sources.columns.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesQuery.data.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>{source.type}</TableCell>
                    <TableCell className="truncate">{source.url ?? t("sources.columns.noUrl")}</TableCell>
                    <TableCell>{source.is_enabled ? t("sources.enabled") : t("sources.disabled")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => runNow.mutate(source.id)}>
                        {t("sources.runNow")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("sources.empty")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("importRuns.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {importRunsQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : importRunsQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("importRuns.columns.source")}</TableHead>
                  <TableHead>{t("importRuns.columns.started")}</TableHead>
                  <TableHead>{t("importRuns.columns.finished")}</TableHead>
                  <TableHead>{t("importRuns.columns.status")}</TableHead>
                  <TableHead className="text-right">{t("importRuns.columns.counts")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRunsQuery.data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.source_id}</TableCell>
                    <TableCell>{formatDateTime(locale, run.started_at)}</TableCell>
                    <TableCell>{formatDateTime(locale, run.finished_at)}</TableCell>
                    <TableCell>{run.status}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(locale, run.inserted_count)} / {formatNumber(locale, run.updated_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("importRuns.empty")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
