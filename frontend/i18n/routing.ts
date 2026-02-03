import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en", "ru"],
  defaultLocale: "de",
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
  },
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
