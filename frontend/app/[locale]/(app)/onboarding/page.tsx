"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Document, Match, Profile } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatters";

const buildProfileSchema = (validation: (key: string) => string) =>
  z.object({
    full_name: z.string().min(2, validation("name")),
    location: z.string().optional(),
    desired_roles: z.string().min(2, validation("roles")),
    languages: z.string().optional(),
    salary_min: z.string().optional(),
    salary_max: z.string().optional(),
  });

type ProfileForm = z.infer<ReturnType<typeof buildProfileSchema>>;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [docKind, setDocKind] = useState("resume");
  const queryClient = useQueryClient();
  const t = useTranslations("onboarding");
  const validation = useTranslations("validation");
  const common = useTranslations("common");
  const locale = useLocale();

  const steps = [
    t("steps.profile"),
    t("steps.documents"),
    t("steps.import"),
    t("steps.matching"),
  ];

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<Profile>("/me/profile"),
  });

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<Document[]>("/me/documents"),
  });

  const matchesQuery = useQuery({
    queryKey: ["matches"],
    queryFn: () => apiFetch<Match[]>("/me/matches"),
  });

  const formDefaults = useMemo(() => {
    const profile = profileQuery.data;
    return {
      full_name: profile?.full_name ?? "",
      location: profile?.location ?? "",
      desired_roles: (profile?.desired_roles ?? []).join(", "),
      languages: profile?.languages ? JSON.stringify(profile.languages) : "",
      salary_min: profile?.salary_min?.toString() ?? "",
      salary_max: profile?.salary_max?.toString() ?? "",
    };
  }, [profileQuery.data]);

  const { register, handleSubmit, formState } = useForm<ProfileForm>({
    resolver: zodResolver(buildProfileSchema(validation)),
    values: formDefaults,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      let parsedLanguages: Record<string, string> | undefined = undefined;
      if (data.languages) {
        try {
          parsedLanguages = JSON.parse(data.languages) as Record<string, string>;
        } catch (error) {
          throw new Error(t("errors.invalidLanguages"));
        }
      }
      return apiFetch<Profile>("/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: data.full_name,
          location: data.location,
          desired_roles: data.desired_roles
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean),
          languages: parsedLanguages,
          salary_min: data.salary_min ? Number(data.salary_min) : undefined,
          salary_max: data.salary_max ? Number(data.salary_max) : undefined,
        }),
      });
    },
    onSuccess: () => {
      toast.success(t("toast.profileUpdated"));
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setStep(1);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("errors.profileSave")),
  });

  const uploadDoc = useMutation({
    mutationFn: async ({ kind, file }: { kind: string; file: File }) => {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);
      return apiFetch<Document>("/me/documents/upload", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast.success(t("toast.documentUploaded"));
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error(t("errors.uploadFailed")),
  });

  const importVacancies = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch("/vacancies/import/csv", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast.success(t("toast.vacanciesImported"));
      setStep(3);
    },
    onError: () => toast.error(t("errors.importFailed")),
  });

  const runMatching = useMutation({
    mutationFn: () => apiFetch("/matching/run", { method: "POST" }),
    onSuccess: () => {
      toast.success(t("toast.matchingQueued"));
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: () => toast.error(t("errors.matchingFailed")),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {steps.map((label, index) => (
          <Badge key={label} variant={index === step ? "default" : "secondary"}>
            {index + 1}. {label}
          </Badge>
        ))}
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step1.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((data) => updateProfile.mutate(data))}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("step1.fullName")}</label>
                <Input {...register("full_name")} />
                {formState.errors.full_name && (
                  <p className="text-xs text-red-500">{formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("step1.location")}</label>
                <Input placeholder={t("step1.locationPlaceholder")} {...register("location")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("step1.roles")}</label>
                <Input placeholder={t("step1.rolesPlaceholder")} {...register("desired_roles")} />
                {formState.errors.desired_roles && (
                  <p className="text-xs text-red-500">{formState.errors.desired_roles.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("step1.languages")}</label>
                <Input placeholder={t("step1.languagesPlaceholder")} {...register("languages")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("step1.salaryMin")}</label>
                <Input type="number" {...register("salary_min")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("step1.salaryMax")}</label>
                <Input type="number" {...register("salary_max")} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? t("step1.saving") : t("step1.submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step2.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={docKind}
                onChange={(event) => setDocKind(event.target.value)}
              >
                <option value="resume">{t("step2.kinds.resume")}</option>
                <option value="cover_letter">{t("step2.kinds.cover_letter")}</option>
                <option value="other">{t("step2.kinds.other")}</option>
              </select>
              <Input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    uploadDoc.mutate({ kind: docKind, file });
                  }
                }}
              />
            </div>
            <div className="grid gap-3">
              {documentsQuery.isLoading ? (
                <Skeleton className="h-20" />
              ) : documentsQuery.data?.length ? (
                documentsQuery.data.map((doc) => (
                  <Card key={doc.id} className="border-dashed">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-medium">{t(`step2.kinds.${doc.kind}`)}</div>
                        <div className="text-xs text-muted-foreground">{t(`status.${doc.status}`)}</div>
                      </div>
                      <Badge variant={doc.status === "processed" ? "default" : "secondary"}>
                        {t(`status.${doc.status}`)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">{t("step2.empty")}</div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} variant="outline">
                {t("step2.continue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step3.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              readOnly
              value={t("step3.sampleHeader")}
            />
            <Input
              type="file"
              accept=".csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  importVacancies.mutate(file);
                }
              }}
            />
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                {t("step3.back")}
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                {t("step3.continue")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("step4.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("step4.subtitle")}
            </p>
            <Button onClick={() => runMatching.mutate()} disabled={runMatching.isPending}>
              {runMatching.isPending ? t("step4.running") : t("step4.run")}
            </Button>
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("step4.latestMatches")}</div>
              {matchesQuery.isLoading ? (
                <Skeleton className="h-20" />
              ) : matchesQuery.data?.length ? (
                <div className="grid gap-2">
                  {matchesQuery.data.slice(0, 4).map((match) => (
                    <div key={match.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="text-sm font-medium">
                          {t("step4.vacancyLabel", { id: match.vacancy_id })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("step4.scoreLabel", {
                            score: formatNumber(locale, match.score, { maximumFractionDigits: 0 }),
                          })}
                        </div>
                      </div>
                      <Badge>
                        {common("percent", { value: formatNumber(locale, match.score, { maximumFractionDigits: 0 }) })}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t("step4.empty")}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
