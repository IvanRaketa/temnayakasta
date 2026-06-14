import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { PostStatus, UserInterestEventType, type Prisma } from "@/lib/generated/prisma/client";

const DEFAULT_LIMIT = 10;
const RECENT_CANDIDATE_LIMIT = 90;
const ACTIVE_CANDIDATE_LIMIT = 50;
const INTEREST_EVENT_LIMIT = 320;
const FOLLOW_LIMIT = 500;
const INTEREST_WINDOW_DAYS = 90;

const postInclude = {
  author: {
    select: {
      username: true,
      avatar: true,
      premiumUntil: true,
      profile: {
        select: {
          displayName: true,
          avatar: true,
          premiumNameEffect: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
      reactions: true,
      views: true,
    },
  },
  reactions: {
    select: {
      type: true,
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.PostInclude;

type RecommendationPost = Prisma.PostGetPayload<{ include: typeof postInclude }>;

interface InterestProfile {
  authorWeights: Map<string, number>;
  tagWeights: Map<string, number>;
  seenPostIds: Set<string>;
  dislikedPostIds: Set<string>;
  quickSkippedPostIds: Set<string>;
  followedAuthorIds: Set<string>;
  signalCount: number;
}

interface ScoredPost {
  post: RecommendationPost;
  score: number;
  reason: string;
}

export interface HomeRecommendation {
  post: RecommendationPost;
  reason: string;
}

function getAgeDays(date: Date | null) {
  if (!date) {
    return 30;
  }

  return Math.max(0, (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function getFreshnessScore(post: RecommendationPost) {
  const ageDays = getAgeDays(post.publishedAt ?? post.createdAt);
  return 14 * Math.exp(-ageDays / 18);
}

function getReactionBreakdown(post: RecommendationPost) {
  return post.reactions.reduce(
    (counts, reaction) => {
      if (reaction.type === "LIKE") {
        counts.likes += 1;
      } else if (reaction.type === "DISLIKE") {
        counts.dislikes += 1;
      }

      return counts;
    },
    { likes: 0, dislikes: 0 },
  );
}

function getPopularityScore(post: RecommendationPost) {
  const { likes, dislikes } = getReactionBreakdown(post);

  return (
    Math.log1p(likes) * 5 -
    Math.log1p(dislikes) * 3 +
    Math.log1p(post._count.comments) * 6 +
    Math.log1p(post._count.views) * 2
  );
}

function getEventWeight(event: {
  type: UserInterestEventType;
  value: number | null;
  createdAt: Date;
}) {
  const recency = Math.max(0.25, Math.exp(-getAgeDays(event.createdAt) / 45));

  const base =
    event.type === UserInterestEventType.POST_VIEW
      ? 1.5
      : event.type === UserInterestEventType.POST_LIKE
        ? 7
        : event.type === UserInterestEventType.POST_DISLIKE
          ? -8
          : event.type === UserInterestEventType.POST_COMMENT
            ? 8
            : event.type === UserInterestEventType.PROFILE_VIEW
              ? 2.5
              : event.type === UserInterestEventType.FOLLOW
                ? 10
                : event.type === UserInterestEventType.TAG_CLICK
                  ? 5
                  : event.type === UserInterestEventType.DWELL_TIME
                    ? 4 + Math.min((event.value ?? 0) / 45, 6)
                    : -10;

  return base * recency;
}

function addWeight(weights: Map<string, number>, key: string | null | undefined, value: number) {
  if (!key) {
    return;
  }

  weights.set(key, (weights.get(key) ?? 0) + value);
}

async function loadInterestProfile(userId: string): Promise<InterestProfile> {
  const since = new Date(Date.now() - INTEREST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [events, follows] = await Promise.all([
    db.userInterestEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: INTEREST_EVENT_LIMIT,
      select: {
        type: true,
        postId: true,
        authorId: true,
        tagId: true,
        value: true,
        createdAt: true,
        post: {
          select: {
            authorId: true,
            tags: {
              select: {
                tagId: true,
              },
            },
          },
        },
      },
    }),
    db.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
      take: FOLLOW_LIMIT,
      select: { followingId: true },
    }),
  ]);

  const profile: InterestProfile = {
    authorWeights: new Map(),
    tagWeights: new Map(),
    seenPostIds: new Set(),
    dislikedPostIds: new Set(),
    quickSkippedPostIds: new Set(),
    followedAuthorIds: new Set(follows.map((follow) => follow.followingId)),
    signalCount: events.length + follows.length,
  };

  for (const follow of follows) {
    addWeight(profile.authorWeights, follow.followingId, 10);
  }

  for (const event of events) {
    const weight = getEventWeight(event);
    const targetAuthorId = event.authorId ?? event.post?.authorId;

    addWeight(profile.authorWeights, targetAuthorId, weight);
    addWeight(profile.tagWeights, event.tagId, weight);

    for (const postTag of event.post?.tags ?? []) {
      addWeight(profile.tagWeights, postTag.tagId, weight);
    }

    if (
      event.postId &&
      (event.type === UserInterestEventType.POST_VIEW ||
        event.type === UserInterestEventType.POST_DISLIKE ||
        event.type === UserInterestEventType.DWELL_TIME ||
        event.type === UserInterestEventType.QUICK_SKIP)
    ) {
      profile.seenPostIds.add(event.postId);
    }

    if (event.postId && event.type === UserInterestEventType.POST_DISLIKE) {
      profile.dislikedPostIds.add(event.postId);
    }

    if (event.postId && event.type === UserInterestEventType.QUICK_SKIP) {
      profile.quickSkippedPostIds.add(event.postId);
    }
  }

  return profile;
}

async function loadCandidatePosts(userId?: string | null) {
  const where: Prisma.PostWhereInput = {
    status: PostStatus.PUBLISHED,
    publishedAt: { not: null },
    authorId: userId ? { not: userId } : undefined,
  };

  const [recentPosts, activePosts] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: RECENT_CANDIDATE_LIMIT,
      include: postInclude,
    }),
    db.post.findMany({
      where,
      orderBy: [
        { reactions: { _count: "desc" } },
        { comments: { _count: "desc" } },
        { views: { _count: "desc" } },
        { publishedAt: "desc" },
      ],
      take: ACTIVE_CANDIDATE_LIMIT,
      include: postInclude,
    }),
  ]);

  const byId = new Map<string, RecommendationPost>();

  for (const post of [...recentPosts, ...activePosts]) {
    byId.set(post.id, post);
  }

  return [...byId.values()];
}

function chooseReason(input: {
  post: RecommendationPost;
  profile?: InterestProfile;
  tagMatchScore: number;
  authorMatchScore: number;
  popularityScore: number;
  freshnessScore: number;
}) {
  if (input.profile?.followedAuthorIds.has(input.post.authorId)) {
    return "от автора, на которого ты подписан";
  }

  if (input.tagMatchScore >= 5 || input.authorMatchScore >= 7) {
    return "потому что ты читал похожее";
  }

  if (input.popularityScore >= 10) {
    return "популярно сейчас";
  }

  if (input.freshnessScore >= 8 && input.popularityScore >= 3) {
    return "свежая активная тема";
  }

  return "новое в ленте";
}

function scorePost(post: RecommendationPost, profile?: InterestProfile): ScoredPost {
  const freshnessScore = getFreshnessScore(post);
  const popularityScore = getPopularityScore(post);
  let tagMatchScore = 0;
  let authorMatchScore = 0;
  let score = freshnessScore + popularityScore;

  if (profile) {
    tagMatchScore = post.tags.reduce(
      (total, postTag) => total + (profile.tagWeights.get(postTag.tag.id) ?? 0),
      0,
    );
    authorMatchScore = profile.authorWeights.get(post.authorId) ?? 0;

    score += Math.min(Math.max(tagMatchScore, 0) * 2.2, 34);
    score += Math.min(Math.max(authorMatchScore, 0) * 2, 26);

    if (profile.followedAuthorIds.has(post.authorId)) {
      score += 24;
    }

    if (profile.seenPostIds.has(post.id)) {
      score -= 18;
    }

    if (profile.dislikedPostIds.has(post.id)) {
      score -= 36;
    }

    if (profile.quickSkippedPostIds.has(post.id)) {
      score -= 28;
    }
  }

  return {
    post,
    score,
    reason: chooseReason({
      post,
      profile,
      tagMatchScore,
      authorMatchScore,
      popularityScore,
      freshnessScore,
    }),
  };
}

function diversify(scoredPosts: ScoredPost[], limit: number) {
  const selected: ScoredPost[] = [];
  const remaining = [...scoredPosts].sort((left, right) => right.score - left.score);
  const authorUse = new Map<string, number>();
  const tagUse = new Map<string, number>();

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const item = remaining[index];
      const repeatedAuthorPenalty = (authorUse.get(item.post.authorId) ?? 0) * 8;
      const repeatedTagPenalty = item.post.tags.reduce(
        (penalty, postTag) => penalty + (tagUse.get(postTag.tag.id) ?? 0) * 4,
        0,
      );
      const primaryTagId = item.post.tags[0]?.tag.id;
      const saturatedTopicPenalty =
        primaryTagId && (tagUse.get(primaryTagId) ?? 0) >= 3 ? 14 : 0;
      const adjustedScore =
        item.score - repeatedAuthorPenalty - repeatedTagPenalty - saturatedTopicPenalty;

      if (adjustedScore > bestAdjustedScore) {
        bestIndex = index;
        bestAdjustedScore = adjustedScore;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    selected.push(picked);
    authorUse.set(picked.post.authorId, (authorUse.get(picked.post.authorId) ?? 0) + 1);

    for (const postTag of picked.post.tags) {
      tagUse.set(postTag.tag.id, (tagUse.get(postTag.tag.id) ?? 0) + 1);
    }
  }

  return selected;
}

async function createHomeRecommendations(userId: string | null | undefined, limit: number) {
  const [candidatePosts, profile] = await Promise.all([
    loadCandidatePosts(userId),
    userId ? loadInterestProfile(userId) : Promise.resolve<InterestProfile | undefined>(undefined),
  ]);
  const effectiveProfile =
    profile && (profile.signalCount >= 3 || profile.followedAuthorIds.size > 0)
      ? profile
      : undefined;
  const scoredPosts = candidatePosts.map((post) => scorePost(post, effectiveProfile));

  return diversify(scoredPosts, limit).map<HomeRecommendation>((item) => ({
    post: item.post,
    reason: item.reason,
  }));
}

const getCachedGuestHomeRecommendations = unstable_cache(
  async (limit: number) => createHomeRecommendations(undefined, limit),
  ["guest-home-recommendations"],
  { revalidate: 30 },
);

export async function getHomeRecommendations(userId?: string | null, limit = DEFAULT_LIMIT) {
  const safeLimit = Math.max(1, Math.min(limit, 20));

  if (!userId) {
    return getCachedGuestHomeRecommendations(safeLimit);
  }

  return createHomeRecommendations(userId, safeLimit);
}
