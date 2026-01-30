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

const profileSchema = z.object({
  full_name: z.string().min(2, "Please enter your name"),
  location: z.string().optional(),
  desired_roles: z.string().min(2, "Add at least one role"),
  languages: z.string().optional(),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const steps = [
  "Profile setup",
  "Upload documents",
  "Import vacancies",
  "Run matching",
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [docKind, setDocKind] = useState("resume");
  const queryClient = useQueryClient();

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
    resolver: zodResolver(profileSchema),
    values: formDefaults,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      let parsedLanguages: Record<string, string> | undefined = undefined;
      if (data.languages) {
        try {
          parsedLanguages = JSON.parse(data.languages) as Record<string, string>;
        } catch (error) {
          throw new Error("Invalid JSON for languages");
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
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setStep(1);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to save profile"),
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
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error("Upload failed"),
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
      toast.success("Vacancies imported");
      setStep(3);
    },
    onError: () => toast.error("Import failed"),
  });

  const runMatching = useMutation({
    mutationFn: () => apiFetch("/matching/run", { method: "POST" }),
    onSuccess: () => {
      toast.success("Matching queued");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: () => toast.error("Unable to run matching"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Onboarding wizard</h1>
        <p className="text-sm text-muted-foreground">
          Complete the steps to start generating matches and packages.
        </p>
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
            <CardTitle>Step 1: Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((data) => updateProfile.mutate(data))}>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Full name</label>
                <Input {...register("full_name")} />
                {formState.errors.full_name && (
                  <p className="text-xs text-red-500">{formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Location</label>
                <Input placeholder="Berlin, Germany" {...register("location")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Desired roles</label>
                <Input placeholder="Product Manager, Data Analyst" {...register("desired_roles")} />
                {formState.errors.desired_roles && (
                  <p className="text-xs text-red-500">{formState.errors.desired_roles.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Languages (JSON)</label>
                <Input placeholder='{"English": "native"}' {...register("languages")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary min</label>
                <Input type="number" {...register("salary_min")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary max</label>
                <Input type="number" {...register("salary_max")} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  Save and continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={docKind}
                onChange={(event) => setDocKind(event.target.value)}
              >
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover letter</option>
                <option value="other">Other</option>
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
                        <div className="font-medium">{doc.kind}</div>
                        <div className="text-xs text-muted-foreground">{doc.status}</div>
                      </div>
                      <Badge variant={doc.status === "processed" ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} variant="outline">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Import vacancies CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              readOnly
              value="title,location,remote,salary_min,salary_max,currency,description,url"
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
                Back
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Run matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Launch the matching pipeline to score your vacancies.
            </p>
            <Button onClick={() => runMatching.mutate()} disabled={runMatching.isPending}>
              Run matching
            </Button>
            <div className="space-y-2">
              <div className="text-sm font-medium">Latest matches</div>
              {matchesQuery.isLoading ? (
                <Skeleton className="h-20" />
              ) : matchesQuery.data?.length ? (
                <div className="grid gap-2">
                  {matchesQuery.data.slice(0, 4).map((match) => (
                    <div key={match.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <div className="text-sm font-medium">Vacancy {match.vacancy_id}</div>
                        <div className="text-xs text-muted-foreground">Score {match.score.toFixed(0)}%</div>
                      </div>
                      <Badge>{match.score.toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No matches yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
