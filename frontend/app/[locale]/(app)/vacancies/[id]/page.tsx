"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Application, ApplicationStatus, Vacancy } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/lib/navigation";
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
  const [draft, setDraft] = useState({
    title: "",
    company: "",
    location: "",
    remote: false,
    salary_min: "",
    salary_max: "",
    currency: "USD",
    url: "",
    description: "",
  });
  const router = useRouter();

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

  const updateVacancy = useMutation({
    mutationFn: () =>
      apiFetch<Vacancy>(`/vacancies/${vacancyId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: draft.title,
          company: draft.company || undefined,
          location: draft.location || undefined,
          remote: draft.remote,
          salary_min: draft.salary_min ? Number(draft.salary_min) : undefined,
          salary_max: draft.salary_max ? Number(draft.salary_max) : undefined,
          currency: draft.currency || undefined,
          url: draft.url || undefined,
          description: draft.description || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success(t("edit.saved"));
      queryClient.invalidateQueries({ queryKey: ["vacancy", vacancyId] });
    },
    onError: () => toast.error(t("edit.error")),
  });

  const deleteVacancy = useMutation({
    mutationFn: () => apiFetch(`/vacancies/${vacancyId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("edit.deleted"));
      router.push("/vacancies");
      queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    },
    onError: () => toast.error(t("edit.deleteError")),
  });

  const existingApplication = applicationsQuery.data?.find((app) => app.vacancy_id === vacancyId);
  const vacancy = query.data;

  useEffect(() => {
    if (existingApplication) {
      setStatus(existingApplication.status);
      setNotes(existingApplication.notes ?? "");
      setInterviewNotes(existingApplication.interview_notes ?? "");
    }
  }, [existingApplication]);

  useEffect(() => {
    if (vacancy) {
      setDraft({
        title: vacancy.title,
        company: vacancy.company ?? "",
        location: vacancy.location ?? "",
        remote: vacancy.remote,
        salary_min: vacancy.salary_min ? String(vacancy.salary_min) : "",
        salary_max: vacancy.salary_max ? String(vacancy.salary_max) : "",
        currency: vacancy.currency ?? "USD",
        url: vacancy.url ?? "",
        description: vacancy.description ?? "",
      });
    }
  }, [vacancy]);

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!vacancy) {
    return <div className="text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const currentStatus = existingApplication?.status ?? status;
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

      <Card>
        <CardHeader>
          <CardTitle>{t("edit.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            aria-label={t("edit.fields.title")}
          />
          <Input
            value={draft.company}
            onChange={(event) => setDraft({ ...draft, company: event.target.value })}
            aria-label={t("edit.fields.company")}
          />
          <Input
            value={draft.location}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            aria-label={t("edit.fields.location")}
          />
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={draft.remote ? "true" : "false"}
            onChange={(event) => setDraft({ ...draft, remote: event.target.value === "true" })}
            aria-label={t("edit.fields.remote")}
          >
            <option value="false">{t("edit.remoteOptions.onsite")}</option>
            <option value="true">{t("edit.remoteOptions.remote")}</option>
          </select>
          <Input
            type="number"
            value={draft.salary_min}
            onChange={(event) => setDraft({ ...draft, salary_min: event.target.value })}
            aria-label={t("edit.fields.salaryMin")}
          />
          <Input
            type="number"
            value={draft.salary_max}
            onChange={(event) => setDraft({ ...draft, salary_max: event.target.value })}
            aria-label={t("edit.fields.salaryMax")}
          />
          <Input
            value={draft.currency}
            onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
            aria-label={t("edit.fields.currency")}
          />
          <Input
            value={draft.url}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            aria-label={t("edit.fields.url")}
          />
          <Textarea
            className="md:col-span-2"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            aria-label={t("edit.fields.description")}
          />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={() => updateVacancy.mutate()} disabled={updateVacancy.isPending}>
              {updateVacancy.isPending ? t("edit.saving") : t("edit.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => deleteVacancy.mutate()}
              disabled={deleteVacancy.isPending}
            >
              {deleteVacancy.isPending ? t("edit.deleting") : t("edit.delete")}
            </Button>
          </div>
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
