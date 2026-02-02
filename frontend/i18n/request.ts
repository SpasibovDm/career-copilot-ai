import { getRequestConfig as createRequestConfig } from "next-intl/server";

import { defaultLocale, locales } from "../i18n";

export const getRequestConfig = createRequestConfig(async ({ locale }) => {
  const resolvedLocale = locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

export default getRequestConfig;
