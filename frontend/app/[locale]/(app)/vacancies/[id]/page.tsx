"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Application, ApplicationStatus, Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function VacancyDetailPage() {
  const params = useParams();
  const vacancyId = params?.id as string;
  const t = useTranslations("vacancyDetail");
  const common = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDays, setReminderDays] = useState("7");
  const [notes, setNotes] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("saved");

  const query = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: () => apiFetch<Vacancy>(`/vacancies/${vacancyId}`),
    enabled: Boolean(vacancyId),
  });

  const applicationsQuery = useQuery({
    queryKey: ["applications"],
    queryFn: () => apiFetch<Application[]>("/me/applications"),
  });

  const updateApplication = useMutation({
    mutationFn: () =>
      apiFetch<Application>(`/me/applications/${vacancyId}`, {
        method: "PUT",
        body: JSON.stringify({ status, notes, interview_notes: interviewNotes }),
      }),
    onSuccess: () => {
      toast.success(t("application.saved"));
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => toast.error(t("application.error")),
  });

  const createReminder = useMutation({
    mutationFn: () =>
      apiFetch(`/me/applications/${vacancyId}/reminders`, {
        method: "POST",
        body: JSON.stringify({
          title: reminderTitle,
          follow_up_days: reminderDays ? Number(reminderDays) : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success(t("reminders.created"));
      setReminderTitle("");
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: () => toast.error(t("reminders.error")),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!query.data) {
    return <div className="text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const vacancy = query.data;
  const existingApplication = applicationsQuery.data?.find((app) => app.vacancy_id === vacancyId);
  const currentStatus = existingApplication?.status ?? status;
  const currency = vacancy.currency;
  const formatSalaryValue = (value?: number | null) => {
    if (!value) return common("notAvailable");
    return currency ? formatCurrency(locale, value, currency) : formatNumber(locale, value);
  };

  useEffect(() => {
    if (existingApplication) {
      setStatus(existingApplication.status);
      setNotes(existingApplication.notes ?? "");
      setInterviewNotes(existingApplication.interview_notes ?? "");
    }
  }, [existingApplication]);

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

      <Card>
        <CardHeader>
          <CardTitle>{t("application.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("application.status")}</label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={currentStatus}
                onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
              >
                {["saved", "applied", "interview", "offer", "rejected"].map((value) => (
                  <option key={value} value={value}>
                    {t(`application.statuses.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("application.reminderTitle")}</label>
              <Input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("application.notes")}</label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("application.interviewNotes")}</label>
              <Textarea value={interviewNotes} onChange={(event) => setInterviewNotes(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => updateApplication.mutate()} disabled={updateApplication.isPending}>
              {updateApplication.isPending ? t("application.saving") : t("application.save")}
            </Button>
            <div className="flex items-center gap-2">
              <Input
                className="w-24"
                type="number"
                value={reminderDays}
                onChange={(event) => setReminderDays(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => createReminder.mutate()}
                disabled={createReminder.isPending || !reminderTitle}
              >
                {createReminder.isPending ? t("reminders.creating") : t("reminders.add")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
