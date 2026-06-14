"use client";

import type { ReactNode } from "react";
import { BookOpen, Eye, MessageSquareText } from "lucide-react";

import { usePresence } from "@/components/presence/presence-provider";
import { cn } from "@/lib/utils";

function PresencePill({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tk-pill",
        className,
      )}
    >
      {icon}
      {label}: <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

export function PostPresenceCounter({ className }: { className?: string }) {
  const presence = usePresence();
  const readers = presence?.snapshot?.post?.readers ?? 0;

  return (
    <PresencePill
      icon={<BookOpen className="size-3.5 text-primary" />}
      label="Сейчас читают"
      value={readers}
      className={className}
    />
  );
}

export function ProfilePresenceCounter({ className }: { className?: string }) {
  const presence = usePresence();
  const viewers = presence?.snapshot?.profile?.viewers ?? presence?.snapshot?.current.online ?? 0;

  return (
    <PresencePill
      icon={<Eye className="size-3.5 text-primary" />}
      label="Сейчас смотрят"
      value={viewers}
      className={className}
    />
  );
}

export function CommentTypingPresence() {
  const presence = usePresence();
  const commenters = presence?.snapshot?.post?.commenters ?? 0;

  if (commenters <= 0) {
    return null;
  }

  return (
    <PresencePill
      icon={<MessageSquareText className="size-3.5 text-primary" />}
      label="Пишут комментарий"
      value={commenters}
    />
  );
}
