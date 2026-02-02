"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/navigation";

const buildSchema = (validation: (key: string) => string) =>
  z.object({
    email: z.string().email(validation("email")),
    password: z.string().min(8, validation("passwordMin")),
  });

type FormData = z.infer<ReturnType<typeof buildSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const validation = useTranslations("validation");
  const setTokens = useAuthStore((state) => state.setTokens);
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
  const showDemo = ["local", "demo"].includes(appEnv);
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "demo@career-demo.ai";
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "Demo1234!";

  const schema = buildSchema(validation);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      setTokens(response.access_token, response.refresh_token);
      toast.success(t("toastSuccess"));
      router.push("/dashboard");
    } catch (error) {
      toast.error(t("toastError"));
    }
  };

  const handleDemoLogin = async () => {
    try {
      const response = await apiFetch<{ access_token: string; refresh_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });
      setTokens(response.access_token, response.refresh_token);
      toast.success(t("demoSuccess"));
      router.push("/dashboard");
    } catch (error) {
      toast.error(t("demoError"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("emailLabel")}</label>
              <Input type="email" placeholder={t("emailPlaceholder")} {...register("email")} aria-label={t("emailLabel")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("passwordLabel")}</label>
              <Input type="password" {...register("password")} aria-label={t("passwordLabel")} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {t("submit")}
            </Button>
          </form>
          {showDemo && (
            <Button type="button" variant="outline" className="w-full" onClick={handleDemoLogin}>
              {t("demoButton")}
            </Button>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {t("footerPrompt")}{" "}
            <Link href="/register" className="text-primary">
              {t("footerLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
