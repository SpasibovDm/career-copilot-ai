import { createLocalizedPathnamesNavigation } from "next-intl/navigation";
import { localePrefix, locales } from "@/i18n";

export const { Link, redirect, usePathname, useRouter } = createLocalizedPathnamesNavigation({
  locales,
  localePrefix,
});
