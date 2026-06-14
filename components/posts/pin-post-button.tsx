import { Pin, PinOff } from "lucide-react";

import { togglePinnedPostAction } from "@/app/(main)/profile/actions";
import { Button } from "@/components/ui/button";

export function PinPostButton({
  postId,
  isPinned,
  className,
}: {
  postId: string;
  isPinned: boolean;
  className?: string;
}) {
  const Icon = isPinned ? PinOff : Pin;

  return (
    <form action={togglePinnedPostAction} className={className}>
      <input type="hidden" name="postId" value={postId} />
      <Button type="submit" variant={isPinned ? "default" : "secondary"} className="w-full">
        <Icon className="size-4" />
        {isPinned ? "Открепить" : "Закрепить"}
      </Button>
    </form>
  );
}
