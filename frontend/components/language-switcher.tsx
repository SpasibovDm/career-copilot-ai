"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "de", labelKey: "locales.de" },
  { code: "en", labelKey: "locales.en" },
  { code: "ru", labelKey: "locales.ru" },
];

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistLocale(locale: string) {
  if (typeof window === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${COOKIE_MAX_AGE}`;
  localStorage.setItem("locale", locale);
}

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground">{t("label")}</span>
      <div className="flex items-center gap-1 rounded-full border px-2 py-1">
        {LOCALES.map((item) => (
          <Link
            key={item.code}
            href={pathname}
            locale={item.code}
            onClick={() => persistLocale(item.code)}
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold transition",
              locale === item.code ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}
