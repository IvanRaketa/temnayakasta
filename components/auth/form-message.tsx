import type { FormState } from "@/app/(auth)/form-state";

interface FormMessageProps {
  state: FormState;
  field?: string;
}

export function FormMessage({ state, field }: FormMessageProps) {
  const message = field ? state.fieldErrors?.[field] : state.message;

  if (!message) return null;

  return (
    <p className={field ? "text-xs text-destructive" : "text-sm leading-6 text-muted-foreground"}>
      {message}
    </p>
  );
}
