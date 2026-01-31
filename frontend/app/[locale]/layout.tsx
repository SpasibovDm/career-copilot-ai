import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Providers } from "@/app/providers";
import { LocaleSync } from "@/components/locale-sync";
import { SiteFooter } from "@/components/site-footer";
import { defaultLocale, locales } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale ?? defaultLocale;
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <Providers>
      <NextIntlClientProvider messages={messages}>
        <LocaleSync locale={locale} />
        {children}
        <SiteFooter />
      </NextIntlClientProvider>
    </Providers>
  );
}
