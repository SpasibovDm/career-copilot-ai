"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginate } from "@/lib/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export default function VacanciesPage() {
  const t = useTranslations("vacancies");
  const common = useTranslations("common");
  const locale = useLocale();
  const [filters, setFilters] = useState({
    q: "",
    location: "",
    remote: "",
    salary_min: "",
  });
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["vacancies", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.location) params.append("location", filters.location);
      if (filters.remote) params.append("remote", filters.remote);
      if (filters.salary_min) params.append("salary_min", filters.salary_min);
      const queryString = params.toString();
      return apiFetch<Vacancy[]>(`/vacancies${queryString ? `?${queryString}` : ""}`);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const paginated = paginate(query.data ?? [], page, 8);

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
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
          <Input
            placeholder={t("filters.location")}
            value={filters.location}
            onChange={(event) => setFilters({ ...filters, location: event.target.value })}
          />
          <Input
            placeholder={t("filters.remote")}
            value={filters.remote}
            onChange={(event) => setFilters({ ...filters, remote: event.target.value })}
          />
          <Input
            type="number"
            placeholder={t("filters.salaryMin")}
            value={filters.salary_min}
            onChange={(event) => setFilters({ ...filters, salary_min: event.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-32" />
          ) : paginated.items.length ? (
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
                {paginated.items.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>{vacancy.location ?? common("notAvailable")}</TableCell>
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
            <div className="text-sm text-muted-foreground">{t("list.empty")}</div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span>{t("pagination.page", { page: paginated.page, total: paginated.totalPages })}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={paginated.page === 1}
              >
                {t("pagination.previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(prev + 1, paginated.totalPages))}
                disabled={paginated.page === paginated.totalPages}
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
