"use client";

import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useFormStatus } from "react-dom";

import { togglePostReactionAction } from "@/app/(main)/post/[slug]/actions";
import type { PostReactionSummary, ReactionTypeValue } from "@/components/comments/comment-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ReactionSubmitButton({
  type,
  count,
  active,
}: {
  type: ReactionTypeValue;
  count: number;
  active: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = type === "LIKE" ? ThumbsUp : ThumbsDown;

  return (
    <Button
      type="submit"
      variant={active ? "default" : "secondary"}
      disabled={pending}
      className="min-w-24 transition-transform active:scale-95"
      aria-label={type === "LIKE" ? "Лайк публикации" : "Дизлайк публикации"}
    >
      <Icon className={cn("size-4", pending && "animate-pulse")} />
      {count}
    </Button>
  );
}

function PostReactionForm({
  slug,
  type,
  count,
  active,
}: {
  slug: string;
  type: ReactionTypeValue;
  count: number;
  active: boolean;
}) {
  return (
    <form action={togglePostReactionAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="type" value={type} />
      <ReactionSubmitButton type={type} count={count} active={active} />
    </form>
  );
}

interface PostReactionsProps {
  slug: string;
  reactions: PostReactionSummary;
  isAuthenticated: boolean;
  isVerified?: boolean;
}

export function PostReactions({ slug, reactions, isAuthenticated, isVerified = true }: PostReactionsProps) {
  if (!isAuthenticated) {
    return (
      <div className="tk-glass flex flex-col gap-2 rounded-md p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Войдите, чтобы поставить реакцию.</span>
        <Link href="/login" className="font-medium text-primary hover:underline">
          Войти
        </Link>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="tk-glass rounded-md p-3 text-sm text-muted-foreground">
        Подтвердите e-mail для полного доступа.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PostReactionForm
        slug={slug}
        type="LIKE"
        count={reactions.counts.LIKE}
        active={reactions.viewerReaction === "LIKE"}
      />
      <PostReactionForm
        slug={slug}
        type="DISLIKE"
        count={reactions.counts.DISLIKE}
        active={reactions.viewerReaction === "DISLIKE"}
      />
    </div>
  );
}
