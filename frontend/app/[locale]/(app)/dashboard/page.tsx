"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { Match, Reminder, StatsResponse, Vacancy } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatDateTime, formatNumber } from "@/lib/formatters";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const common = useTranslations("common");
  const locale = useLocale();
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => apiFetch<StatsResponse>("/me/stats"),
  });
  const matchesQuery = useQuery({
    queryKey: ["matches"],
    queryFn: () => apiFetch<Match[]>("/me/matches"),
  });
  const vacanciesQuery = useQuery({
    queryKey: ["vacancies"],
    queryFn: () => apiFetch<Vacancy[]>("/vacancies"),
  });
  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: () => apiFetch<Reminder[]>("/me/reminders"),
  });

  const distribution = useMemo(() => {
    const scores = matchesQuery.data ?? [];
    const buckets = [0, 20, 40, 60, 80, 100].map((start) => ({
      range: `${start}-${start + 19}`,
      count: 0,
    }));
    scores.forEach((match) => {
      const index = Math.min(Math.floor(match.score / 20), 4);
      buckets[index].count += 1;
    });
    return buckets;
  }, [matchesQuery.data]);

  const salaryBands = useMemo(() => {
    const vacancies = vacanciesQuery.data ?? [];
    if (!vacancies.length) {
      return [];
    }
    return vacancies.slice(0, 8).map((vacancy) => ({
      title: vacancy.title.slice(0, 12),
      min: vacancy.salary_min ?? 0,
      max: vacancy.salary_max ?? 0,
    }));
  }, [vacanciesQuery.data]);

  const statusData = useMemo(() => {
    const applications = statsQuery.data?.applications_by_status ?? {
      saved: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    return Object.entries(applications).map(([status, count]) => ({
      status: t(`status.${status}`),
      count,
    }));
  }, [statsQuery.data, t]);

  const topMatches = (matchesQuery.data ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">{t("runOnboarding")}</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsQuery.isLoading
          ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)
          : [
              {
                label: t("kpis.totalVacancies"),
                value: formatNumber(locale, statsQuery.data?.vacancies_count ?? 0),
              },
              {
                label: t("kpis.matchesGenerated"),
                value: formatNumber(locale, statsQuery.data?.matches_count ?? 0),
              },
              {
                label: t("kpis.documentsParsed"),
                value: `${formatNumber(locale, statsQuery.data?.documents_parsed_count ?? 0)}/${formatNumber(
                  locale,
                  statsQuery.data?.documents_count ?? 0
                )}`,
              },
              {
                label: t("kpis.lastMatchRun"),
                value:
                  formatDateTime(locale, statsQuery.data?.last_matching_run_at) ??
                  t("kpis.notRunYet"),
              },
              {
                label: t("kpis.upcomingReminders"),
                value: formatNumber(locale, statsQuery.data?.upcoming_reminders ?? 0),
              },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{kpi.value}</CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t("charts.matchDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {matchesQuery.isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t("charts.salaryBands")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {vacanciesQuery.isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryBands}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="min" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="max" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t("charts.pipelineStatuses")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {statsQuery.isLoading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("reminders.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {remindersQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : remindersQuery.data?.length ? (
              <div className="space-y-3">
                {remindersQuery.data.slice(0, 6).map((reminder) => (
                  <div key={reminder.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{reminder.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(locale, reminder.due_at)}
                      </span>
                    </div>
                    {reminder.note && <p className="text-xs text-muted-foreground">{reminder.note}</p>}
                    <div className="text-xs text-muted-foreground">{t(`reminders.status.${reminder.status}`)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t("reminders.empty")}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("topMatches.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {matchesQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : topMatches.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("topMatches.table.vacancy")}</TableHead>
                    <TableHead>{t("topMatches.table.score")}</TableHead>
                    <TableHead>{t("topMatches.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMatches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>{match.vacancy_id}</TableCell>
                      <TableCell>
                        {common("percent", { value: formatNumber(locale, match.score, { maximumFractionDigits: 0 }) })}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/vacancies/${match.vacancy_id}`}>{t("topMatches.table.view")}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">{t("topMatches.empty")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pipeline.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{t("pipeline.subtitle")}</div>
        </CardContent>
      </Card>
    </div>
  );
}
