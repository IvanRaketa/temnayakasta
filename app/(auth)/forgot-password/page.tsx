import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  description: "Восстановление пароля в Тёмной Касте по шестизначному коду.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="tk-glass-strong">
      <CardHeader>
        <CardTitle className="text-2xl">Восстановление пароля</CardTitle>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm email={params.email} />
      </CardContent>
    </Card>
  );
}
