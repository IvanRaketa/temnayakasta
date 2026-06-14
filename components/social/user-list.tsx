import Link from "next/link";

import { FollowButton } from "@/components/social/follow-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UserListItem {
  id: string;
  username: string;
  avatar?: string | null;
  bio?: string | null;
  isFollowing: boolean;
  profile?: {
    displayName?: string | null;
    avatar?: string | null;
    bio?: string | null;
  } | null;
}

interface UserListProps {
  users: UserListItem[];
  currentUserId?: string | null;
  isAuthenticated: boolean;
  isVerified?: boolean;
}

function getDisplayName(user: UserListItem) {
  return user.profile?.displayName || user.username;
}

function getAvatar(user: UserListItem) {
  return user.profile?.avatar || user.avatar;
}

function getBio(user: UserListItem) {
  return user.profile?.bio || user.bio;
}

export function UserList({ users, currentUserId, isAuthenticated, isVerified = true }: UserListProps) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm leading-6 text-muted-foreground">Список пока пуст.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const displayName = getDisplayName(user);
        const avatar = getAvatar(user);
        const bio = getBio(user);

        return (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="size-full object-cover" />
                    ) : (
                      displayName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${user.username}`}
                      className="block truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {displayName}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                    {bio ? (
                      <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                        {bio}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <Button asChild variant="secondary" className="w-full sm:w-auto">
                    <Link href={`/profile/${user.username}`}>Профиль</Link>
                  </Button>
                  <FollowButton
                    targetUserId={user.id}
                    targetUsername={user.username}
                    isAuthenticated={isAuthenticated}
                    isVerified={isVerified}
                    isFollowing={user.isFollowing}
                    isSelf={currentUserId === user.id}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
