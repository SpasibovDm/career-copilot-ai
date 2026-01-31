"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ExportPdfResponse, GeneratedPackage } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PackagePage() {
  const params = useParams();
  const packageId = params?.id as string;
  const [template, setTemplate] = useState<"minimal" | "modern" | "classic">("modern");
  const t = useTranslations("packages");

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
          </div>
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
              <Button size="sm" onClick={() => downloadText(t("files.cv"), pkg.cv_text)}>
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
              <Button size="sm" onClick={() => downloadText(t("files.cover"), pkg.cover_letter_text)}>
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
              <Button size="sm" onClick={() => downloadText(t("files.hr"), pkg.hr_message_text)}>
                {t("actions.downloadTxt")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
