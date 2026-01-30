"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Document } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsPage() {
  const query = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<Document[]>("/me/documents"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">Track parsing status and extracted metadata.</p>
      </div>

      <div className="space-y-4">
        {query.isLoading ? (
          <Skeleton className="h-32" />
        ) : query.data?.length ? (
          query.data.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{doc.kind}</CardTitle>
                <Badge variant={doc.status === "processed" ? "default" : "secondary"}>
                  {doc.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">S3 key: {doc.s3_key}</div>
                {doc.status === "failed" && (
                  <div className="rounded-md border border-dashed p-3 text-xs text-red-500">
                    OCR_TODO: {doc.failure_reason ?? "Parsing failed"}
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
          <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
        )}
      </div>
    </div>
  );
}
