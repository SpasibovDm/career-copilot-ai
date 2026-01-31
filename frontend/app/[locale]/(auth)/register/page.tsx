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

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const validation = useTranslations("validation");
  const setTokens = useAuthStore((state) => state.setTokens);
  const schema = buildSchema(validation);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await apiFetch<{ access_token: string; refresh_token: string }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      setTokens(response.access_token, response.refresh_token);
      toast.success(t("toastSuccess"));
      router.push("/onboarding");
    } catch (error) {
      toast.error(t("toastError"));
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
              <Input type="email" placeholder={t("emailPlaceholder")} {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("passwordLabel")}</label>
              <Input type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {t("submit")}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("footerPrompt")}{" "}
            <Link href="/login" className="text-primary">
              {t("footerLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
