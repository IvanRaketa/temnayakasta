"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  children: React.ReactNode;
}

export function SubmitButton({ children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending}>
      {pending ? "Подождите..." : children}
    </Button>
  );
}
