"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button className="mt-4" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
