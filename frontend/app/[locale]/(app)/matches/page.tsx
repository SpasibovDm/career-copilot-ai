"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Match, MatchDetail, PaginatedResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/navigation";

export default function MatchesPage() {
  const t = useTranslations("matches");
  const common = useTranslations("common");
  const locale = useLocale();
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [queryValue, setQueryValue] = useState("");
  const [expandedMatch, setExpandedMatch] = useState<MatchDetail | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setQueryValue(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [queryValue]);

  const matchesQuery = useQuery({
    queryKey: ["matches", queryValue, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (queryValue) params.append("q", queryValue);
      params.append("page", page.toString());
      params.append("page_size", pageSize.toString());
      const queryString = params.toString();
      return apiFetch<PaginatedResponse<Match>>(`/me/matches${queryString ? `?${queryString}` : ""}`);
    },
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

  const detailMutation = useMutation({
    mutationFn: (matchId: string) => apiFetch<MatchDetail>(`/me/matches/${matchId}`),
    onSuccess: (data) => setExpandedMatch(data),
    onError: () => toast.error(t("toastDetailError")),
  });

  const totalPages = useMemo(() => {
    if (!matchesQuery.data) return 1;
    return Math.max(1, Math.ceil(matchesQuery.data.total / matchesQuery.data.page_size));
  }, [matchesQuery.data]);
  const items = matchesQuery.data?.items ?? [];

  const highlight = (text: string | null | undefined) => {
    if (!text || !queryValue) return text;
    const escaped = queryValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");
    const normalized = queryValue.toLowerCase();
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
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label={t("searchPlaceholder")}
          />
          {matchesQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : items.length ? (
            items.map((match) => (
              <div key={match.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t("list.vacancyLabel")}</div>
                    <div className="font-medium">{highlight(match.vacancy_title ?? match.vacancy_id)}</div>
                    {match.vacancy_company && (
                      <div className="text-xs text-muted-foreground">
                        {highlight(match.vacancy_company)}
                      </div>
                    )}
                  </div>
                  <Badge>
                    {common("percent", { value: formatNumber(locale, match.score, { maximumFractionDigits: 0 }) })}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => detailMutation.mutate(match.id)}
                      disabled={detailMutation.isPending}
                    >
                      {detailMutation.isPending && expandedMatch?.id === match.id
                        ? t("list.loadingDetails")
                        : t("list.viewDetails")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => generateMutation.mutate(match.vacancy_id)}
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? t("list.generating") : t("list.generate")}
                    </Button>
                  </div>
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
                {expandedMatch?.id === match.id && (
                  <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{t("details.title")}</div>
                    {expandedMatch.reasons?.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {expandedMatch.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-muted-foreground">{t("details.noReasons")}</p>
                    )}
                    {expandedMatch.skill_gap_plan?.length ? (
                      <div className="mt-3">
                        <div className="font-medium">{t("details.skillGap")}</div>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {expandedMatch.skill_gap_plan.map((skill) => (
                            <li key={skill.skill}>
                              {skill.skill}{" "}
                              <a href={skill.link} className="text-primary" target="_blank" rel="noreferrer">
                                {t("details.learnLink")}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              <div>{t("list.empty")}</div>
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link href="/onboarding">{t("list.emptyCta")}</Link>
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
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
