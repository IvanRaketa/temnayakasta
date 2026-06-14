import { db } from "@/lib/db";
import {
  CommentStatus,
  PostStatus,
  ReactionType,
  UserRole,
  UserStatus,
} from "@/lib/generated/prisma/client";

const XP_PER_POST = 10;
const XP_PER_COMMENT = 3;
const XP_PER_RECEIVED_LIKE = 1;
const XP_PER_FOLLOWER = 5;

export interface IslandStats {
  publishedPosts: number;
  comments: number;
  receivedLikes: number;
  followers: number;
  profileViews: number;
  postViews: number;
  totalViews: number;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgress: number;
  levelProgressPercent: number;
}

export interface IslandAchievement {
  code: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt: Date | null;
}

interface AchievementRule {
  code: string;
  title: string;
  description: string;
  isUnlocked: (input: {
    stats: IslandStats;
    user: {
      role: UserRole;
      premiumUntil: Date | null;
      createdAt: Date;
    };
    now: Date;
  }) => boolean;
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    code: "first_publication",
    title: "Первая публикация",
    description: "Опубликован первый пост.",
    isUnlocked: ({ stats }) => stats.publishedPosts >= 1,
  },
  {
    code: "ten_publications",
    title: "10 публикаций",
    description: "Опубликовано 10 постов.",
    isUnlocked: ({ stats }) => stats.publishedPosts >= 10,
  },
  {
    code: "hundred_publications",
    title: "100 публикаций",
    description: "Опубликовано 100 постов.",
    isUnlocked: ({ stats }) => stats.publishedPosts >= 100,
  },
  {
    code: "thousand_likes",
    title: "1000 лайков",
    description: "Получено 1000 лайков.",
    isUnlocked: ({ stats }) => stats.receivedLikes >= 1000,
  },
  {
    code: "hundred_comments",
    title: "100 комментариев",
    description: "Написано 100 комментариев.",
    isUnlocked: ({ stats }) => stats.comments >= 100,
  },
  {
    code: "first_follower",
    title: "Первый подписчик",
    description: "Появился первый подписчик.",
    isUnlocked: ({ stats }) => stats.followers >= 1,
  },
  {
    code: "hundred_followers",
    title: "100 подписчиков",
    description: "Собрано 100 подписчиков.",
    isUnlocked: ({ stats }) => stats.followers >= 100,
  },
  {
    code: "year_on_site",
    title: "Год на сайте",
    description: "Профиль старше одного года.",
    isUnlocked: ({ user, now }) =>
      now.getTime() - user.createdAt.getTime() >= 365 * 24 * 60 * 60 * 1000,
  },
  {
    code: "premium",
    title: "Premium",
    description: "Активирован Premium статус.",
    isUnlocked: ({ user, now }) => Boolean(user.premiumUntil && user.premiumUntil > now),
  },
  {
    code: "moderator",
    title: "Moderator",
    description: "Получена роль модератора.",
    isUnlocked: ({ user }) => user.role === UserRole.MODERATOR || user.role === UserRole.ADMIN,
  },
  {
    code: "admin",
    title: "Admin",
    description: "Получена роль администратора.",
    isUnlocked: ({ user }) => user.role === UserRole.ADMIN,
  },
];

function getLevelFloorXp(level: number) {
  return Math.max(0, (level - 1) * (level - 1) * 100);
}

function calculateLevel(xp: number) {
  let level = 1;

  while (xp >= getLevelFloorXp(level + 1)) {
    level += 1;
  }

  const currentLevelXp = getLevelFloorXp(level);
  const nextLevelXp = getLevelFloorXp(level + 1);
  const levelProgress = xp - currentLevelXp;
  const levelSize = Math.max(1, nextLevelXp - currentLevelXp);

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgress,
    levelProgressPercent: Math.min(100, Math.round((levelProgress / levelSize) * 100)),
  };
}

function calculateXp(input: {
  publishedPosts: number;
  comments: number;
  receivedLikes: number;
  followers: number;
}) {
  return (
    input.publishedPosts * XP_PER_POST +
    input.comments * XP_PER_COMMENT +
    input.receivedLikes * XP_PER_RECEIVED_LIKE +
    input.followers * XP_PER_FOLLOWER
  );
}

export async function getProfileIsland(username: string) {
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      role: true,
      status: true,
      premiumUntil: true,
      deletedAt: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          avatar: true,
          bio: true,
          premiumNameEffect: true,
        },
      },
      _count: {
        select: {
          followers: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const [
    publishedPosts,
    comments,
    receivedPostLikes,
    receivedCommentLikes,
    profileViews,
    postViews,
  ] = await Promise.all([
    db.post.count({
      where: {
        authorId: user.id,
        status: PostStatus.PUBLISHED,
      },
    }),
    db.comment.count({
      where: {
        authorId: user.id,
        status: CommentStatus.PUBLISHED,
      },
    }),
    db.reaction.count({
      where: {
        type: ReactionType.LIKE,
        post: {
          authorId: user.id,
        },
      },
    }),
    db.reaction.count({
      where: {
        type: ReactionType.LIKE,
        comment: {
          authorId: user.id,
        },
      },
    }),
    db.profileView.count({
      where: {
        profileUserId: user.id,
      },
    }),
    db.postView.count({
      where: {
        post: {
          authorId: user.id,
        },
      },
    }),
  ]);

  const receivedLikes = receivedPostLikes + receivedCommentLikes;
  const xp = calculateXp({
    publishedPosts,
    comments,
    receivedLikes,
    followers: user._count.followers,
  });
  const level = calculateLevel(xp);
  const stats: IslandStats = {
    publishedPosts,
    comments,
    receivedLikes,
    followers: user._count.followers,
    profileViews,
    postViews,
    totalViews: profileViews + postViews,
    xp,
    ...level,
  };

  const now = new Date();
  const unlockedRules = ACHIEVEMENT_RULES.filter((rule) =>
    rule.isUnlocked({
      stats,
      user,
      now,
    }),
  );

  if (unlockedRules.length > 0 && !user.deletedAt && user.status !== UserStatus.BANNED) {
    await db.userAchievement.createMany({
      data: unlockedRules.map((rule) => ({
        userId: user.id,
        code: rule.code,
      })),
      skipDuplicates: true,
    });
  }

  const unlockedRows = await db.userAchievement.findMany({
    where: { userId: user.id },
    select: {
      code: true,
      unlockedAt: true,
    },
  });
  const unlockedAtByCode = new Map(unlockedRows.map((row) => [row.code, row.unlockedAt]));
  const achievements: IslandAchievement[] = ACHIEVEMENT_RULES.map((rule) => {
    const unlockedAt = unlockedAtByCode.get(rule.code) ?? null;

    return {
      code: rule.code,
      title: rule.title,
      description: rule.description,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
    };
  });

  return {
    user,
    stats,
    achievements,
    premiumActive: Boolean(user.premiumUntil && user.premiumUntil > now),
  };
}
