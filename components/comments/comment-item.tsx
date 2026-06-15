"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquareReply, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { deleteCommentAction, toggleCommentReactionAction } from "@/app/(main)/post/[slug]/actions";
import { ReplyForm } from "@/components/comments/reply-form";
import type { CommentViewModel, DiscussionUser, ReactionTypeValue } from "@/components/comments/comment-types";
import { PremiumName } from "@/components/premium/premium-name";
import { ReportForm } from "@/components/reports/report-form";
import { Button } from "@/components/ui/button";
import { DELETED_COMMENT_TEXT } from "@/lib/comments/content";
import { getCommentStatusLabel } from "@/lib/ui/status-labels";
import { cn } from "@/lib/utils";

const MAX_INDENT_LEVEL = 2;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function authorName(comment: CommentViewModel) { return comment.author.deletedAt ? "Удалённый пользователь" : comment.author.profile?.displayName || comment.author.username; }
function authorAvatar(comment: CommentViewModel) { return comment.author.profile?.avatar || comment.author.avatar; }
function replyWord(count: number) {
  const modulo100 = count % 100;
  const modulo10 = count % 10;
  if (modulo100 >= 11 && modulo100 <= 14) return "ответов";
  if (modulo10 === 1) return "ответ";
  if (modulo10 >= 2 && modulo10 <= 4) return "ответа";
  return "ответов";
}

function ReactionSubmitButton({ type, count, active, disabled }: { type: ReactionTypeValue; count: number; active: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  const Icon = type === "LIKE" ? ThumbsUp : ThumbsDown;
  return <Button type="submit" variant={active ? "default" : "ghost"} size="sm" disabled={pending || disabled} className="h-8 px-2 transition-transform active:scale-95" aria-label={type === "LIKE" ? "Лайк комментария" : "Дизлайк комментария"}><Icon className={cn("size-4", pending && "animate-pulse")} />{count}</Button>;
}
function CommentReactionForm({ slug, commentId, type, count, active, disabled }: { slug: string; commentId: string; type: ReactionTypeValue; count: number; active: boolean; disabled: boolean }) {
  return <form action={toggleCommentReactionAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="commentId" value={commentId} /><input type="hidden" name="type" value={type} /><ReactionSubmitButton type={type} count={count} active={active} disabled={disabled} /></form>;
}

interface CommentItemProps { comment: CommentViewModel; slug: string; postPath: string; currentUser?: DiscussionUser | null; depth?: number; branchOpen?: boolean; }

export function CommentItem({ comment, slug, postPath, currentUser, depth = 0, branchOpen = false }: CommentItemProps) {
  const [repliesOpen, setRepliesOpen] = useState(depth === 0);
  const isHidden = comment.status === "HIDDEN" || comment.status === "BLOCKED";
  const isPending = comment.status === "PENDING_REVIEW";
  const isAuthor = currentUser?.id === comment.author.id;
  const canInteract = Boolean(currentUser?.emailVerified) && comment.status === "PUBLISHED";
  const isCappedDepth = depth >= MAX_INDENT_LEVEL;
  const avatar = authorAvatar(comment);
  const name = authorName(comment);
  const replyCount = comment.replies.length;
  const hasReplies = replyCount > 0;
  const repliesId = `comment-replies-${comment.id}`;
  const replyCountText = `${replyCount} ${replyWord(replyCount)}`;
  const canToggleReplies = hasReplies && !branchOpen;
  const showReplies = hasReplies && (branchOpen || repliesOpen);
  const nextBranchOpen = branchOpen || repliesOpen;

  return (
    <div className={cn("min-w-0 space-y-3", depth > 0 && !isCappedDepth && "pl-0.5 sm:pl-1")}>
      <div className="tk-glass rounded-md p-3 transition-colors sm:p-4">
        <div className="flex min-w-0 gap-3">
          <div className="tk-avatar-ring grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{avatar && !isHidden ? <img src={avatar} alt="" className="size-full object-cover" decoding="async" /> : name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
              {comment.author.deletedAt || isHidden ? <span className="truncate text-sm font-medium text-foreground">{name}</span> : <Link href={`/profile/${comment.author.username}`} className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"><PremiumName user={comment.author} className="truncate">{name}</PremiumName></Link>}
              <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              {comment.status !== "PUBLISHED" ? <span className="tk-pill px-1.5 py-0.5 text-[11px]">{getCommentStatusLabel(comment.status)}</span> : null}
            </div>
            <p className={cn("whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]", isHidden && "text-muted-foreground")}>{isHidden ? DELETED_COMMENT_TEXT : comment.content}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {currentUser?.emailVerified ? <><CommentReactionForm slug={slug} commentId={comment.id} type="LIKE" count={comment.reactionCounts.LIKE} active={comment.viewerReaction === "LIKE"} disabled={!canInteract} /><CommentReactionForm slug={slug} commentId={comment.id} type="DISLIKE" count={comment.reactionCounts.DISLIKE} active={comment.viewerReaction === "DISLIKE"} disabled={!canInteract} />{comment.status === "PUBLISHED" ? <details className="group w-full sm:w-auto"><summary className="inline-flex h-8 cursor-pointer list-none items-center justify-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"><MessageSquareReply className="size-4" />Ответить</summary><div className="mt-2 origin-top transition-all duration-200 sm:min-w-96"><ReplyForm slug={slug} parentId={comment.id} onDone={() => setRepliesOpen(true)} /></div></details> : null}{isAuthor && !isHidden ? <form action={deleteCommentAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="commentId" value={comment.id} /><Button type="submit" variant="ghost" size="sm" className="h-8 px-2"><Trash2 className="size-4" />Удалить</Button></form> : null}{!isAuthor && !isHidden && !isPending ? <ReportForm targetType="COMMENT" targetId={comment.id} returnPath={postPath} className="w-full sm:w-auto" /> : null}</> : <span className="text-xs text-muted-foreground">{currentUser ? "Подтвердите e-mail для полного доступа." : "Войдите, чтобы ответить или поставить реакцию."}</span>}
            </div>
          </div>
        </div>
      </div>
      {canToggleReplies ? <div className="flex items-center"><Button type="button" variant="secondary" size="sm" aria-expanded={repliesOpen} aria-controls={repliesId} onClick={() => setRepliesOpen((open) => !open)} className="h-8 max-w-full px-2.5 text-xs">{repliesOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<span className="truncate">{repliesOpen ? `Скрыть ветку · ${replyCountText}` : `Показать ветку · ${replyCountText}`}</span></Button></div> : null}
      {showReplies ? <div id={repliesId} className={cn("relative space-y-3", depth < MAX_INDENT_LEVEL && "border-l border-border pl-3 sm:ml-5 sm:pl-4", depth >= MAX_INDENT_LEVEL && "pl-0")}>{comment.replies.map((reply) => <CommentItem key={reply.id} comment={reply} slug={slug} postPath={postPath} currentUser={currentUser} depth={depth + 1} branchOpen={nextBranchOpen} />)}</div> : null}
    </div>
  );
}
