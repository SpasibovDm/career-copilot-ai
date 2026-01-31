"use client";

import { useEffect } from "react";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LocaleSync({ locale }: { locale: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${COOKIE_MAX_AGE}`;
    localStorage.setItem("locale", locale);
  }, [locale]);

  return null;
}
