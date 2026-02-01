import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="rounded-lg border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold">{t("notFoundTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundSubtitle")}</p>
    </div>
  );
}
