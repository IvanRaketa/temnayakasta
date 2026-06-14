import type { Metadata } from "next";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Подтверждение почты",
  description: "Подтверждение email шестизначным кодом в Тёмной Касте.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="tk-glass-strong">
      <CardHeader>
        <CardTitle className="text-2xl">Подтверждение почты</CardTitle>
      </CardHeader>
      <CardContent>
        <VerifyEmailForm email={params.email} />
      </CardContent>
    </Card>
  );
}
