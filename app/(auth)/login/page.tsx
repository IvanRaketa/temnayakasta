import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в аккаунт Тёмной Касты по email или username.",
};

export default function LoginPage() {
  return (
    <Card className="tk-glass-strong">
      <CardHeader>
        <CardTitle className="text-2xl">Вход</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
