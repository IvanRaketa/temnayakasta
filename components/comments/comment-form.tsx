"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useFormStatus } from "react-dom";

import { createCommentAction, type DiscussionActionState } from "@/app/(main)/post/[slug]/actions";
import { usePresenceActivity } from "@/components/presence/presence-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/lib/comments/content";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";

const initialState: DiscussionActionState = { ok: false };

function CommentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      className="w-full transition-transform active:scale-[0.98] sm:w-auto"
    >
      <Send className="size-4" />
      {pending ? "Отправка..." : "Отправить"}
    </Button>
  );
}

interface CommentFormProps {
  slug: string;
  isAuthenticated: boolean;
  isVerified?: boolean;
}

export function CommentForm({ slug, isAuthenticated, isVerified = true }: CommentFormProps) {
  const [state, formAction] = useActionState(createCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { resetActivity, setTemporaryActivity } = usePresenceActivity();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      resetActivity();
    }
  }, [resetActivity, state.ok]);

  if (!isAuthenticated) {
    return (
      <div className="tk-glass rounded-xl p-4 text-sm text-muted-foreground">
        Чтобы присоединиться к обсуждению,{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          войдите в аккаунт
        </Link>
        .
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="tk-glass rounded-xl p-4 text-sm text-muted-foreground">
        Подтвердите e-mail для полного доступа.
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <Textarea
        name="content"
        maxLength={COMMENT_MAX_LENGTH}
        required
        placeholder="Напишите комментарий"
        className="min-h-28 resize-y"
        onFocus={() => setTemporaryActivity("commenting_post")}
        onChange={() => setTemporaryActivity("commenting_post")}
        onBlur={resetActivity}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          До {COMMENT_MAX_LENGTH} символов. Комментарии публичны и могут быть доступны другим
          пользователям и посетителям сайта.{" "}
          <Link
            href={LEGAL_DOCUMENTS.personalDataDistributionConsent.href}
            className="text-primary hover:underline"
          >
            Подробнее
          </Link>
          .
        </p>
        <CommentSubmitButton />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm text-accent" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
