"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export default function VacancyDetailPage() {
  const params = useParams();
  const vacancyId = params?.id as string;
  const t = useTranslations("vacancyDetail");
  const common = useTranslations("common");
  const locale = useLocale();

  const query = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => apiFetch<Vacancy>(`/vacancies/${vacancyId}`),
    enabled: Boolean(vacancyId),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!query.data) {
    return <div className="text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const vacancy = query.data;
  const currency = vacancy.currency;
  const formatSalaryValue = (value?: number | null) => {
    if (!value) return common("notAvailable");
    return currency ? formatCurrency(locale, value, currency) : formatNumber(locale, value);
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost">
        <Link href="/vacancies">{t("back")}</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{vacancy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {vacancy.location ?? t("remoteFallback")}
          </div>
          <div>
            {t("salaryLabel")} {formatSalaryValue(vacancy.salary_min)} - {formatSalaryValue(vacancy.salary_max)}
          </div>
          <div className="text-sm">
            {t("sourceLabel")} {t(`sources.${vacancy.source}`)}
          </div>
          {vacancy.url && (
            <a href={vacancy.url} className="text-sm text-primary" target="_blank" rel="noreferrer">
              {t("viewPosting")}
            </a>
          )}
          {vacancy.description && (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">{vacancy.description}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
