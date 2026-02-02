"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFoundSubtitle")}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
