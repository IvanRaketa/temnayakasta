import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Регистрация аккаунта в Тёмной Касте.",
};

export default function RegisterPage() {
  return (
    <Card className="tk-glass-strong">
      <CardHeader>
        <CardTitle className="text-2xl">Регистрация</CardTitle>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
