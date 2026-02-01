"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <Button className="mt-4" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
