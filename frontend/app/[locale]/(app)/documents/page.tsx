"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Document } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<Document[]>("/me/documents"),
  });

  const reparseDoc = useMutation({
    mutationFn: (documentId: string) => apiFetch<Document>(`/me/documents/${documentId}/reparse`, { method: "POST" }),
    onSuccess: () => {
      toast.success(t("reparseQueued"));
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: () => toast.error(t("reparseFailed")),
  });

  const getStatusLabel = (status: string) => t(`status.${status}`);
  const getKindLabel = (kind: string) => t(`kinds.${kind}`);
  const getPreview = (doc: Document) => {
    const data = doc.extracted_json as Record<string, unknown> | null | undefined;
    if (!data) return null;
    return {
      skills: Array.isArray(data.skills) ? (data.skills as string[]) : [],
      experience: Array.isArray(data.experience) ? (data.experience as string[]) : [],
      education: Array.isArray(data.education) ? (data.education as string[]) : [],
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        {query.isLoading ? (
          <Skeleton className="h-32" />
        ) : query.data?.length ? (
          query.data.map((doc) => {
            const preview = getPreview(doc);
            return (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{getKindLabel(doc.kind)}</CardTitle>
                <Badge variant={doc.status === "processed" ? "default" : "secondary"}>
                  {getStatusLabel(doc.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">{t("s3Key", { key: doc.s3_key })}</div>
                {doc.status === "failed" && (
                  <div className="rounded-md border border-dashed p-3 text-xs text-red-500">
                    {t("failure", { reason: doc.failure_reason ?? t("failureFallback") })}
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reparseDoc.mutate(doc.id)}
                        disabled={reparseDoc.isPending}
                      >
                        {t("reparse")}
                      </Button>
                    </div>
                  </div>
                )}
                {preview && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border bg-muted/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide">{t("preview.skills")}</div>
                      {preview.skills.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {preview.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">{t("preview.empty")}</div>
                      )}
                    </div>
                    <div className="rounded-md border bg-muted/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide">{t("preview.experience")}</div>
                      {preview.experience.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {preview.experience.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">{t("preview.empty")}</div>
                      )}
                    </div>
                    <div className="rounded-md border bg-muted/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide">{t("preview.education")}</div>
                      {preview.education.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {preview.education.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">{t("preview.empty")}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })
        ) : (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            <div>{t("empty")}</div>
            <Button asChild className="mt-3" size="sm" variant="outline">
              <Link href="/onboarding">{t("emptyCta")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
