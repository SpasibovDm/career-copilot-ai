"use client";

import { useLocale, useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="border-t bg-background/60 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted-foreground md:flex-row">
        <span>{t("tagline")}</span>
        <span>{t("locale", { locale: locale.toUpperCase() })}</span>
      </div>
    </footer>
  );
}
