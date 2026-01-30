"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paginate } from "@/lib/pagination";
import { Skeleton } from "@/components/ui/skeleton";

export default function VacanciesPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Vacancies</h1>
        <p className="text-sm text-muted-foreground">Search and filter your imported roles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search keywords"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
          <Input
            placeholder="Location"
            value={filters.location}
            onChange={(event) => setFilters({ ...filters, location: event.target.value })}
          />
          <Input
            placeholder="Remote (true/false)"
            value={filters.remote}
            onChange={(event) => setFilters({ ...filters, remote: event.target.value })}
          />
          <Input
            type="number"
            placeholder="Salary min"
            value={filters.salary_min}
            onChange={(event) => setFilters({ ...filters, salary_min: event.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vacancy list</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <Skeleton className="h-32" />
          ) : paginated.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Remote</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.items.map((vacancy) => (
                  <TableRow key={vacancy.id}>
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>{vacancy.location ?? "-"}</TableCell>
                    <TableCell>{vacancy.remote ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {vacancy.salary_min ? `$${vacancy.salary_min}` : "-"} -
                      {vacancy.salary_max ? ` $${vacancy.salary_max}` : " -"}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/vacancies/${vacancy.id}`}>Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-sm text-muted-foreground">No vacancies found.</div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
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
