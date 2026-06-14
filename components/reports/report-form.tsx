"use client";

import { useActionState, useEffect, useRef } from "react";
import { Flag } from "lucide-react";

import { createReportAction, type ReportActionState } from "@/app/(main)/reports/actions";
import { reportReasons } from "@/lib/moderation/report-reasons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: ReportActionState = {};

interface ReportFormProps {
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  returnPath: string;
  disabled?: boolean;
  className?: string;
}

export function ReportForm({ targetType, targetId, returnPath, disabled = false, className }: ReportFormProps) {
  const [state, action] = useActionState(createReportAction, initialState);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (state.ok) detailsRef.current?.removeAttribute("open");
  }, [state.ok]);

  if (disabled) return null;

  return (
    <details ref={detailsRef} className={className} suppressHydrationWarning>
      <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-border bg-background/35 px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Flag className="size-4" />
        Пожаловаться
      </summary>
      <form action={action} className="tk-glass mt-3 space-y-3 rounded-md p-3">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${targetType}-${targetId}-reason`}>
            Причина
          </label>
          <select
            id={`${targetType}-${targetId}-reason`}
            name="reason"
            className="h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-ring"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Выберите причину
            </option>
            {reportReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.reason ? <p className="text-xs text-destructive">{state.fieldErrors.reason}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${targetType}-${targetId}-details`}>
            Комментарий
          </label>
          <Textarea
            id={`${targetType}-${targetId}-details`}
            name="details"
            maxLength={1000}
            className="min-h-24"
            placeholder="Можно оставить пустым"
          />
        </div>
        {state.message ? (
          <p className={state.ok ? "text-sm text-accent" : "text-sm text-destructive"}>{state.message}</p>
        ) : null}
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          Отправить
        </Button>
      </form>
    </details>
  );
}
