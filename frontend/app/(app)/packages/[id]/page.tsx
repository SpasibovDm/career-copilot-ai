"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { GeneratedPackage } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

  const query = useQuery({
    queryKey: ["package", packageId],
    queryFn: () => apiFetch<GeneratedPackage>(`/me/generated/${packageId}`),
    enabled: Boolean(packageId),
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (!query.data) {
    return <div className="text-sm text-muted-foreground">Package not found.</div>;
  }

  const pkg = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated package</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="cv">
          <TabsList>
            <TabsTrigger value="cv">Tailored CV</TabsTrigger>
            <TabsTrigger value="cover">Cover letter</TabsTrigger>
            <TabsTrigger value="hr">HR message</TabsTrigger>
          </TabsList>
          <TabsContent value="cv">
            <pre className="whitespace-pre-wrap text-sm">{pkg.cv_text}</pre>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(pkg.cv_text);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
              <Button size="sm" onClick={() => downloadText("tailored-cv.txt", pkg.cv_text)}>
                Download .txt
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
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
              <Button size="sm" onClick={() => downloadText("cover-letter.txt", pkg.cover_letter_text)}>
                Download .txt
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
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
              <Button size="sm" onClick={() => downloadText("hr-message.txt", pkg.hr_message_text)}>
                Download .txt
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
