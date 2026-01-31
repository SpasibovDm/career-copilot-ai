"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Document } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<Document[]>("/me/documents"),
  });

  const getStatusLabel = (status: string) => t(`status.${status}`);
  const getKindLabel = (kind: string) => t(`kinds.${kind}`);

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
          query.data.map((doc) => (
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
                  </div>
                )}
                {doc.extracted_json && (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(doc.extracted_json, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">{t("empty")}</div>
        )}
      </div>
    </div>
  );
}
