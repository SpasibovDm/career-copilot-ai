"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function VacancyDetailPage() {
  const params = useParams();
  const vacancyId = params?.id as string;

  const query = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => apiFetch<Vacancy>(`/vacancies/${vacancyId}`),
    enabled: Boolean(vacancyId),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!query.data) {
    return <div className="text-sm text-muted-foreground">Vacancy not found.</div>;
  }

  const vacancy = query.data;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost">
        <Link href="/vacancies">← Back to vacancies</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{vacancy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">{vacancy.location ?? "Remote"}</div>
          <div>
            Salary: {vacancy.salary_min ? `$${vacancy.salary_min}` : "-"} -
            {vacancy.salary_max ? ` $${vacancy.salary_max}` : " -"}
          </div>
          <div className="text-sm">Source: {vacancy.source}</div>
          {vacancy.url && (
            <a href={vacancy.url} className="text-sm text-primary" target="_blank" rel="noreferrer">
              View posting
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
