import Link from "next/link";
import { UserCheck, UserPlus } from "lucide-react";

import { toggleFollowAction } from "@/app/(main)/profile/actions";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  isAuthenticated: boolean;
  isVerified?: boolean;
  isFollowing: boolean;
  isSelf?: boolean;
  className?: string;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  isAuthenticated,
  isVerified = true,
  isFollowing,
  isSelf = false,
  className,
}: FollowButtonProps) {
  if (isSelf) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button asChild variant="secondary" className={className}>
        <Link href="/login">
          <UserPlus className="size-4" />
          Войти
        </Link>
      </Button>
    );
  }

  if (!isVerified) {
    return (
      <Button asChild variant="secondary" className={className}>
        <Link href="/verify-email">
          <UserPlus className="size-4" />
          Подтвердить e-mail
        </Link>
      </Button>
    );
  }

  return (
    <form action={toggleFollowAction} className={className}>
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="targetUsername" value={targetUsername} />
      <Button type="submit" variant={isFollowing ? "secondary" : "default"} className="w-full">
        {isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {isFollowing ? "Отписаться" : "Подписаться"}
      </Button>
    </form>
  );
}
