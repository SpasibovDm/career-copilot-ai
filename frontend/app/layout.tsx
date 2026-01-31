import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { defaultLocale, locales } from "@/i18n";

export const metadata: Metadata = {
  title: "Career Copilot Portal",
  description: "Automate your job search with Career Copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = locales.includes(localeCookie as (typeof locales)[number])
    ? (localeCookie as (typeof locales)[number])
    : defaultLocale;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
