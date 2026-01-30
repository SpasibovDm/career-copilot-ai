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

export default function MatchesPage() {
  const [page, setPage] = useState(1);
  const matchesQuery = useQuery({
    queryKey: ["matches"],
    queryFn: () => apiFetch<Match[]>("/me/matches"),
  });

  const generateMutation = useMutation({
    mutationFn: (vacancyId: string) => apiFetch(`/generation/${vacancyId}`, { method: "POST" }),
    onSuccess: () => toast.success("Generation queued"),
    onError: () => toast.error("Unable to queue generation"),
  });

  const paginated = paginate(matchesQuery.data ?? [], page, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Matches</h1>
        <p className="text-sm text-muted-foreground">Review match scores and generate packages.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {matchesQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : paginated.items.length ? (
            paginated.items.map((match) => (
              <div key={match.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Vacancy ID</div>
                    <div className="font-medium">{match.vacancy_id}</div>
                  </div>
                  <Badge>{match.score.toFixed(0)}%</Badge>
                  <Button
                    size="sm"
                    onClick={() => generateMutation.mutate(match.vacancy_id)}
                    disabled={generateMutation.isPending}
                  >
                    Generate package
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
            <div className="text-sm text-muted-foreground">No matches yet. Run onboarding to generate.</div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span>Page {paginated.page} of {paginated.totalPages}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={paginated.page === 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(prev + 1, paginated.totalPages))}
                disabled={paginated.page === paginated.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
