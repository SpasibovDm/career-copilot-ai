"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Match } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { paginate } from "@/lib/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";

export default function MatchesPage() {
  const t = useTranslations("matches");
  const common = useTranslations("common");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const matchesQuery = useQuery({
    queryKey: ["matches"],
    queryFn: () => apiFetch<Match[]>("/me/matches"),
  });

  const generateMutation = useMutation({
    mutationFn: (vacancyId: string) =>
      apiFetch(`/generation/${vacancyId}`, {
        method: "POST",
        body: JSON.stringify({ language: locale }),
      }),
    onSuccess: () => toast.success(t("toastSuccess")),
    onError: () => toast.error(t("toastError")),
  });

  const paginated = paginate(matchesQuery.data ?? [], page, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {matchesQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : paginated.items.length ? (
            paginated.items.map((match) => (
              <div key={match.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("list.vacancyId")}</div>
                    <div className="font-medium">{match.vacancy_id}</div>
                  </div>
                  <Badge>
                    {common("percent", { value: formatNumber(locale, match.score, { maximumFractionDigits: 0 }) })}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => generateMutation.mutate(match.vacancy_id)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? t("list.generating") : t("list.generate")}
                  </Button>
                </div>
                {match.explanation && (
                  <p className="mt-3 text-sm text-muted-foreground">{match.explanation}</p>
                )}
                {match.missing_skills && Array.isArray(match.missing_skills) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.missing_skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">{t("list.empty")}</div>
          )}

          <div className="flex items-center justify-between text-sm">
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
