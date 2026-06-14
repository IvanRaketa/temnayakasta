export type ReactionTypeValue = "LIKE" | "DISLIKE";

export interface DiscussionUser {
  id: string;
  username: string;
  emailVerified: boolean;
  avatar?: string | null;
  premiumUntil?: Date | string | null;
  profile?: {
    displayName?: string | null;
    avatar?: string | null;
    premiumNameEffect?: string | null;
  } | null;
}

export interface CommentViewModel {
  id: string;
  parentId?: string | null;
  content: string;
  status: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatar?: string | null;
    premiumUntil?: Date | string | null;
    deletedAt?: string | null;
    profile?: {
      displayName?: string | null;
      avatar?: string | null;
      premiumNameEffect?: string | null;
    } | null;
  };
  reactionCounts: Record<ReactionTypeValue, number>;
  viewerReaction?: ReactionTypeValue | null;
  replies: CommentViewModel[];
}

export interface PostReactionSummary {
  counts: Record<ReactionTypeValue, number>;
  viewerReaction?: ReactionTypeValue | null;
}
