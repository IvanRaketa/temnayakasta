"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { resendEmailVerificationAction, verifyEmailAction } from "@/app/(auth)/actions";
import { initialState } from "@/app/(auth)/form-state";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VerifyEmailFormProps {
  email?: string;
}

function ResendButton({ cooldown, onStart }: { cooldown: number; onStart: () => void }) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      variant="secondary"
      disabled={pending || cooldown > 0}
      onClick={onStart}
    >
      {cooldown > 0 ? `Отправить заново (${cooldown})` : "Отправить заново"}
    </Button>
  );
}

export function VerifyEmailForm({ email = "" }: VerifyEmailFormProps) {
  const [verifyState, verifyAction] = useActionState(verifyEmailAction, initialState);
  const [resendState, resendAction] = useActionState(resendEmailVerificationAction, initialState);
  const [cooldown, setCooldown] = useState(0);
  const [emailValue, setEmailValue] = useState(email);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return (
    <div className="space-y-5">
      <form action={verifyAction} className="space-y-4">
        <div className="space-y-2">
          <Input
            name="email"
            type="email"
            placeholder="email@example.com"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
          />
          <FormMessage state={verifyState} field="email" />
        </div>
        <div className="space-y-2">
          <Input name="code" inputMode="numeric" maxLength={6} placeholder="384921" />
          <FormMessage state={verifyState} field="code" />
        </div>
        <FormMessage state={verifyState} />
        <SubmitButton>Подтвердить почту</SubmitButton>
      </form>
      <form action={resendAction} className="space-y-3">
        <input type="hidden" name="email" value={emailValue} />
        <FormMessage state={resendState} />
        <ResendButton cooldown={cooldown} onStart={() => setCooldown(60)} />
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Уже подтвердили?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
