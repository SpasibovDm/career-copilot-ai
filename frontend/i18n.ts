import { routing } from "./i18n/routing";

export const { locales, defaultLocale, localePrefix } = routing;
export type Locale = (typeof routing.locales)[number];
export { routing };
