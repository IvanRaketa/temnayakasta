import { MessageSquare } from "lucide-react";

import { CommentForm } from "@/components/comments/comment-form";
import { CommentItem } from "@/components/comments/comment-item";
import type { CommentViewModel, DiscussionUser } from "@/components/comments/comment-types";
import { CommentTypingPresence } from "@/components/presence/page-presence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CommentListProps {
  slug: string;
  postPath: string;
  comments: CommentViewModel[];
  currentUser?: DiscussionUser | null;
}

function countComments(comments: CommentViewModel[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

export function CommentList({ slug, postPath, comments, currentUser }: CommentListProps) {
  const total = countComments(comments);

  return (
    <Card className="overflow-hidden tk-glass-strong">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="inline-flex items-center gap-2">
            <MessageSquare className="size-5" />
            Обсуждение
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {total} {total === 1 ? "комментарий" : "комментариев"}
          </span>
        </div>
        <CommentTypingPresence />
        <CommentForm
          slug={slug}
          isAuthenticated={Boolean(currentUser)}
          isVerified={Boolean(currentUser?.emailVerified)}
        />
      </CardHeader>
      <CardContent>
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                slug={slug}
                postPath={postPath}
                currentUser={currentUser}
              />
            ))}
          </div>
        ) : (
          <p className="tk-glass rounded-md border-dashed p-4 text-sm text-muted-foreground">
            Здесь пока тихо. Первый комментарий задаст тон обсуждению.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
