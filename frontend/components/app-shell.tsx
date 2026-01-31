"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/lib/navigation";
import { Briefcase, FileText, Gauge, Home, Inbox, Layers, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/auth-store";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const t = useTranslations("navigation");
  const common = useTranslations("common");

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: Gauge },
    { href: "/onboarding", label: t("onboarding"), icon: Layers },
    { href: "/vacancies", label: t("vacancies"), icon: Briefcase },
    { href: "/matches", label: t("matches"), icon: Inbox },
    { href: "/documents", label: t("documents"), icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Home className="h-5 w-5 text-primary" />
            {common("brand")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={clearTokens}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <LogOut className="h-4 w-4" />
              {common("signOut")}
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-4 shadow-sm">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
