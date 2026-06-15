"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useFormStatus } from "react-dom";

import { createCommentAction, type DiscussionActionState } from "@/app/(main)/post/[slug]/actions";
import { usePresenceActivity } from "@/components/presence/presence-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMENT_MAX_LENGTH } from "@/lib/comments/content";

const initialState: DiscussionActionState = { ok: false };

function ReplySubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      size="sm"
      disabled={pending}
      className="w-full transition-transform active:scale-[0.98] sm:w-auto"
    >
      <Send className="size-4" />
      {pending ? "Отправка..." : "Ответить"}
    </Button>
  );
}

interface ReplyFormProps {
  slug: string;
  parentId: string;
  onDone?: () => void;
}

export function ReplyForm({ slug, parentId, onDone }: ReplyFormProps) {
  const [state, formAction] = useActionState(createCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { resetActivity, setTemporaryActivity } = usePresenceActivity();

  useEffect(() => {
    if (!state.ok) return;

    formRef.current?.reset();
    onDone?.();
    resetActivity();
    router.refresh();

    const refreshAgain = window.setTimeout(() => router.refresh(), 350);
    return () => window.clearTimeout(refreshAgain);
  }, [onDone, resetActivity, router, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="tk-glass space-y-2 rounded-md p-3 transition-all duration-200"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="parentId" value={parentId} />
      <Textarea
        name="content"
        maxLength={COMMENT_MAX_LENGTH}
        required
        placeholder="Ваш ответ"
        className="min-h-24 resize-y"
        onFocus={() => setTemporaryActivity("commenting_post")}
        onChange={() => setTemporaryActivity("commenting_post")}
        onBlur={resetActivity}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">До {COMMENT_MAX_LENGTH} символов.</p>
        <ReplySubmitButton />
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm text-accent" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
