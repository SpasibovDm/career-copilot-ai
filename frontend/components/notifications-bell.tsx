"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Notification } from "@/types/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/formatters";
import { useLocale } from "next-intl";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("notifications");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/me/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/me/notifications/${id}`, { method: "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => apiFetch(`/me/notifications/mark-all-read`, { method: "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.is_read).length;

  return (
    <div className="relative">
      <button
        className="relative inline-flex items-center justify-center rounded-md border px-2 py-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("title")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{t("title")}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              {t("markAll")}
            </Button>
          </div>
          <div className="mt-3 space-y-2 max-h-64 overflow-auto">
            {notificationsQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">{t("loading")}</div>
            ) : notificationsQuery.data?.length ? (
              notificationsQuery.data.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border p-2 text-xs",
                    item.is_read ? "bg-background" : "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{item.title}</div>
                    {!item.is_read && (
                      <button
                        onClick={() => markRead.mutate(item.id)}
                        className="text-xs text-primary"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {item.body && <div className="text-muted-foreground">{item.body}</div>}
                  <div className="text-[10px] text-muted-foreground">
                    {formatDateTime(locale, item.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">{t("empty")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
