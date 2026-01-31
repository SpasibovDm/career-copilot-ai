import { getRequestConfig } from "next-intl/server";

export const locales = ["de", "en", "ru"] as const;
export const defaultLocale = "de";
export const localePrefix = "always";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
