"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ExportPdfResponse, GeneratedPackage, ShareLinkResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth-store";

export default function PackagePage() {
  const params = useParams();
  const packageId = params?.id as string;
  const [template, setTemplate] = useState<"minimal" | "modern" | "classic">("modern");
  const t = useTranslations("packages");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token = useAuthStore.getState().accessToken;

  const downloadText = async (section: "cv" | "cover" | "hr", filename: string) => {
    const response = await fetch(
      `${apiUrl}/me/generated/${packageId}/download?format=txt&section=${section}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!response.ok) {
      throw new Error("Failed");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const query = useQuery({
    queryKey: ["package", packageId],
    queryFn: () => apiFetch<GeneratedPackage>(`/me/generated/${packageId}`),
    enabled: Boolean(packageId),
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ExportPdfResponse>(`/me/generated/${packageId}/export/pdf`, {
        method: "POST",
        body: JSON.stringify({ template }),
      }),
    onSuccess: (data) => {
      window.open(data.download_url, "_blank");
      toast.success(t("toast.exportReady"));
    },
    onError: () => toast.error(t("toast.exportFailed")),
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      apiFetch<ShareLinkResponse>(`/me/generated/${packageId}/share`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.url);
      toast.success(t("share.copied"));
    },
    onError: () => toast.error(t("share.error")),
  });

  const revokeMutation = useMutation({
    mutationFn: () => apiFetch(`/me/generated/${packageId}/share`, { method: "DELETE" }),
    onSuccess: () => toast.success(t("share.revoked")),
    onError: () => toast.error(t("share.error")),
  });

  const bundleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiUrl}/me/generated/${packageId}/bundle.zip`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error("Failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `package-${packageId}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(t("bundle.error")),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!query.data) {
    return <div className="text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const pkg = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">{t("export.title")}</div>
            <div className="text-xs text-muted-foreground">{t("export.subtitle")}</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={template}
              onChange={(event) => setTemplate(event.target.value as "minimal" | "modern" | "classic")}
            >
              <option value="minimal">{t("templates.minimal")}</option>
              <option value="modern">{t("templates.modern")}</option>
              <option value="classic">{t("templates.classic")}</option>
            </select>
            <Button size="sm" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? t("export.exporting") : t("export.download")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bundleMutation.mutate()}
              disabled={bundleMutation.isPending}
            >
              {bundleMutation.isPending ? t("bundle.exporting") : t("bundle.download")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex-1">
            <div className="font-medium">{t("share.title")}</div>
            <div className="text-xs text-muted-foreground">{t("share.subtitle")}</div>
          </div>
          <Button size="sm" onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending}>
            {shareMutation.isPending ? t("share.generating") : t("share.copy")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => revokeMutation.mutate()}
            disabled={revokeMutation.isPending}
          >
            {revokeMutation.isPending ? t("share.revoking") : t("share.revoke")}
          </Button>
        </div>
        <Tabs defaultValue="cv">
          <TabsList>
            <TabsTrigger value="cv">{t("tabs.cv")}</TabsTrigger>
            <TabsTrigger value="cover">{t("tabs.cover")}</TabsTrigger>
            <TabsTrigger value="hr">{t("tabs.hr")}</TabsTrigger>
          </TabsList>
          <TabsContent value="cv">
            <pre className="whitespace-pre-wrap text-sm">{pkg.cv_text}</pre>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(pkg.cv_text);
                  toast.success(t("toast.copied"));
                }}
              >
                {t("actions.copy")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadText("cv", t("files.cv")).catch(() => toast.error(t("toast.downloadFailed")))
                }
              >
                {t("actions.downloadTxt")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="cover">
            <pre className="whitespace-pre-wrap text-sm">{pkg.cover_letter_text}</pre>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(pkg.cover_letter_text);
                  toast.success(t("toast.copied"));
                }}
              >
                {t("actions.copy")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadText("cover", t("files.cover")).catch(() => toast.error(t("toast.downloadFailed")))
                }
              >
                {t("actions.downloadTxt")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="hr">
            <pre className="whitespace-pre-wrap text-sm">{pkg.hr_message_text}</pre>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(pkg.hr_message_text);
                  toast.success(t("toast.copied"));
                }}
              >
                {t("actions.copy")}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  downloadText("hr", t("files.hr")).catch(() => toast.error(t("toast.downloadFailed")))
                }
              >
                {t("actions.downloadTxt")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
