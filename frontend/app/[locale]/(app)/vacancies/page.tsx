"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { PaginatedResponse, SavedFilter, Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { toast } from "sonner";

export default function VacanciesPage() {
  const t = useTranslations("vacancies");
  const common = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const pageSize = 10;
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    remote: "all",
    salary_min: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchInput }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ["vacancies", filters, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.location) params.append("location", filters.location);
      if (filters.remote !== "all") params.append("remote", filters.remote === "remote" ? "true" : "false");
      if (filters.salary_min) params.append("salary_min", filters.salary_min);
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      const queryString = params.toString();
      return apiFetch<PaginatedResponse<Vacancy>>(`/vacancies${queryString ? `?${queryString}` : ""}`);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const savedFiltersQuery = useQuery({
    queryKey: ["saved-filters"],
    queryFn: () => apiFetch<SavedFilter[]>("/me/filters"),
  });

  const savePreset = useMutation({
    mutationFn: () =>
      apiFetch<SavedFilter>("/me/filters", {
        method: "POST",
        body: JSON.stringify({
          name: presetName,
          location: filters.location || undefined,
          remote: filters.remote === "all" ? undefined : filters.remote === "remote",
          salary_min: filters.salary_min ? Number(filters.salary_min) : undefined,
          role_keywords: filters.q ? filters.q.split(/[, ]+/).filter(Boolean) : undefined,
        }),
      }),
    onSuccess: () => {
      setPresetName("");
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast.success(t("filters.saved"));
    },
    onError: () => toast.error(t("filters.saveError")),
  });

  const totalPages = useMemo(() => {
    if (!query.data) return 1;
    return Math.max(1, Math.ceil(query.data.total / query.data.page_size));
  }, [query.data]);
  const items = query.data?.items ?? [];

  const highlight = (text: string | null | undefined) => {
    if (!text || !filters.q) return text ?? common("notAvailable");
    const escaped = filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");
    const normalized = filters.q.toLowerCase();
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === normalized ? (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-yellow-200 px-1 text-yellow-900 dark:bg-yellow-500/40 dark:text-yellow-100"
        >
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  const formatSalary = (vacancy: Vacancy) => {
    const min = vacancy.salary_min;
    const max = vacancy.salary_max;
    if (!min && !max) return common("notAvailable");
    const currency = vacancy.currency;
    const formatValue = (value?: number | null) => {
      if (!value) return common("notAvailable");
      return currency ? formatCurrency(locale, value, currency) : formatNumber(locale, value);
    };
    return `${formatValue(min)} - ${formatValue(max)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("filters.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder={t("filters.search")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label={t("filters.search")}
          />
          <Input
            placeholder={t("filters.location")}
            value={filters.location}
            onChange={(event) => setFilters({ ...filters, location: event.target.value })}
            aria-label={t("filters.location")}
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={filters.remote}
            onChange={(event) => setFilters({ ...filters, remote: event.target.value })}
            aria-label={t("filters.remote")}
          >
            <option value="all">{t("filters.remoteOptions.all")}</option>
            <option value="remote">{t("filters.remoteOptions.remote")}</option>
            <option value="onsite">{t("filters.remoteOptions.onsite")}</option>
          </select>
          <Input
            type="number"
            placeholder={t("filters.salaryMin")}
            value={filters.salary_min}
            onChange={(event) => setFilters({ ...filters, salary_min: event.target.value })}
            aria-label={t("filters.salaryMin")}
          />
        </CardContent>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder={t("filters.presetName")}
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              className="max-w-xs"
              aria-label={t("filters.presetName")}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => savePreset.mutate()}
              disabled={!presetName || savePreset.isPending}
            >
              {savePreset.isPending ? t("filters.saving") : t("filters.save")}
            </Button>
          </div>
          {savedFiltersQuery.data?.length ? (
            <div className="flex flex-wrap gap-2">
              {savedFiltersQuery.data.map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const presetQuery = preset.role_keywords?.join(" ") ?? "";
                    setSearchInput(presetQuery);
                    setFilters({
                      q: presetQuery,
                      location: preset.location ?? "",
                      remote:
                        preset.remote === null || preset.remote === undefined
                          ? "all"
                          : preset.remote
                            ? "remote"
                            : "onsite",
                      salary_min: preset.salary_min ? String(preset.salary_min) : "",
                    });
                  }}
                >
                  {t("filters.applyPreset", { name: preset.name })}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{t("filters.emptyPresets")}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-32" />
          ) : items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("list.table.title")}</TableHead>
                  <TableHead>{t("list.table.location")}</TableHead>
                  <TableHead>{t("list.table.remote")}</TableHead>
                  <TableHead>{t("list.table.salary")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell className="font-medium">
                      {highlight(vacancy.title)}
                      {vacancy.company && (
                        <div className="text-xs text-muted-foreground">{highlight(vacancy.company)}</div>
                      )}
                    </TableCell>
                    <TableCell>{highlight(vacancy.location ?? common("notAvailable"))}</TableCell>
                    <TableCell>{vacancy.remote ? common("yes") : common("no")}</TableCell>
                    <TableCell>{formatSalary(vacancy)}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/vacancies/${vacancy.id}`}>{t("list.table.details")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <div>{t("list.empty")}</div>
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href="/onboarding">{t("list.emptyCta")}</Link>
              </Button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span>{t("pagination.page", { page, total: totalPages })}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                {t("pagination.previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
