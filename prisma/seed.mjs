import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  PostStatus,
  PrismaClient,
  SecurityEventType,
  SecuritySeverity,
  UserRole,
  UserStatus,
} from "../lib/generated/prisma/client.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env before running Prisma seed.");
}

const allowSeed = process.env.ALLOW_DATABASE_SEED === "true";
const productionLike =
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

if (!allowSeed) {
  throw new Error(
    "Refusing to run seed. Set ALLOW_DATABASE_SEED=true and an explicit SEED_PASSWORD for local/test seeding.",
  );
}

if (productionLike && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error(
    "Refusing to run seed in production. Set ALLOW_PRODUCTION_SEED=true only for an approved, temporary maintenance window.",
  );
}

const TEST_PASSWORD = process.env.SEED_PASSWORD;
if (!TEST_PASSWORD || TEST_PASSWORD.length < 12) {
  throw new Error(
    "SEED_PASSWORD must be explicitly set to a strong value of at least 12 characters.",
  );
}

if (/changeme|password|123456|qwerty/i.test(TEST_PASSWORD)) {
  throw new Error("SEED_PASSWORD is too weak for privileged seed accounts.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const now = new Date();
const sessionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

async function main() {
  const testPasswordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@temnayakasta120.ru" },
    update: {
      username: "admin",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: testPasswordHash,
      emailVerified: true,
      profile: {
        upsert: {
          create: { displayName: "admin" },
          update: { displayName: "admin", isHidden: false },
        },
      },
    },
    create: {
      username: "admin",
      email: "admin@temnayakasta120.ru",
      passwordHash: testPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      bio: "Тестовый администратор проекта. Реальные пароли будут хэшироваться на этапе авторизации.",
      profile: {
        create: {
          displayName: "admin",
          bio: "Тестовый администратор проекта.",
        },
      },
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: "moderator@example.com" },
    update: {
      username: "moderator",
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      passwordHash: testPasswordHash,
      emailVerified: true,
      profile: {
        upsert: {
          create: { displayName: "moderator" },
          update: { displayName: "moderator", isHidden: false },
        },
      },
    },
    create: {
      username: "moderator",
      email: "moderator@example.com",
      passwordHash: testPasswordHash,
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      bio: "Test moderator for local access checks.",
      profile: {
        create: {
          displayName: "moderator",
          bio: "Test moderator for local access checks.",
        },
      },
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: "testuser@example.com" },
    update: {
      username: "testuser",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      passwordHash: testPasswordHash,
      emailVerified: true,
      profile: {
        upsert: {
          create: { displayName: "testuser" },
          update: { displayName: "testuser", isHidden: false },
        },
      },
    },
    create: {
      username: "testuser",
      email: "testuser@example.com",
      passwordHash: testPasswordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      bio: "Тестовый автор для локальной разработки.",
      profile: {
        create: {
          displayName: "testuser",
          bio: "Тестовый автор для локальной разработки.",
        },
      },
    },
  });

  const publishedPost = await prisma.post.upsert({
    where: { slug: "pervaya-publikaciya-temnoy-kasty" },
    update: {
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    create: {
      authorId: testUser.id,
      title: "Первая публикация Тёмной Касты",
      content: "Тестовая опубликованная запись для проверки ленты и связей данных.",
      slug: "pervaya-publikaciya-temnoy-kasty",
      status: PostStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  await prisma.post.upsert({
    where: { slug: "chernovik-avtora" },
    update: { status: PostStatus.DRAFT },
    create: {
      authorId: testUser.id,
      title: "Черновик автора",
      content: "Тестовый черновик. Он нужен только для проверки статусов.",
      slug: "chernovik-avtora",
      status: PostStatus.DRAFT,
    },
  });

  await prisma.post.upsert({
    where: { slug: "material-na-proverke" },
    update: { status: PostStatus.PENDING_REVIEW },
    create: {
      authorId: admin.id,
      title: "Материал на проверке",
      content: "Тестовая запись для будущего слоя проверок контента.",
      slug: "material-na-proverke",
      status: PostStatus.PENDING_REVIEW,
    },
  });

  const rootComment = await prisma.comment.upsert({
    where: { id: "seed-comment-admin-root" },
    update: {
      content: "Тестовый комментарий администратора.",
    },
    create: {
      id: "seed-comment-admin-root",
      postId: publishedPost.id,
      authorId: admin.id,
      content: "Тестовый комментарий администратора.",
    },
  });

  await prisma.comment.upsert({
    where: { id: "seed-comment-testuser-reply" },
    update: {
      content: "Тестовый ответ в ветке комментариев.",
    },
    create: {
      id: "seed-comment-testuser-reply",
      postId: publishedPost.id,
      authorId: testUser.id,
      parentId: rootComment.id,
      content: "Тестовый ответ в ветке комментариев.",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        id: "seed-notification-admin-system",
        userId: admin.id,
        type: "system",
        title: "Каркас данных готов",
        message: "Seed создал тестовые записи для проверки инфраструктуры.",
      },
      {
        id: "seed-notification-testuser-post",
        userId: testUser.id,
        type: "post",
        title: "Публикация создана",
        message: "Тестовая опубликованная запись доступна в базе.",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.auditLog.createMany({
    data: [
      {
        id: "seed-audit-admin-created",
        userId: admin.id,
        action: "seed.admin.created",
        ip: "unknown",
        userAgent: "seed-script",
        route: "prisma/seed",
        method: "SEED",
        metadata: { stage: 2 },
      },
      {
        id: "seed-audit-moderator-created",
        userId: moderator.id,
        action: "seed.moderator.created",
        ip: "unknown",
        userAgent: "seed-script",
        route: "prisma/seed",
        method: "SEED",
        metadata: { stage: 9.5 },
      },
      {
        id: "seed-audit-user-created",
        userId: testUser.id,
        action: "seed.user.created",
        ip: "unknown",
        userAgent: "seed-script",
        route: "prisma/seed",
        method: "SEED",
        metadata: { stage: 2 },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.userSession.upsert({
    where: { tokenHash: "seed-session-token-hash-placeholder" },
    update: {
      lastSeenAt: now,
      expiresAt: sessionExpiresAt,
      isRevoked: false,
      revokedAt: null,
    },
    create: {
      userId: testUser.id,
      tokenHash: "seed-session-token-hash-placeholder",
      ip: "unknown",
      userAgent: "seed-script",
      deviceName: "Seed development browser",
      lastSeenAt: now,
      expiresAt: sessionExpiresAt,
    },
  });

  await prisma.securityEvent.createMany({
    data: [
      {
        id: "seed-security-suspicious-activity",
        userId: testUser.id,
        ip: "unknown",
        userAgent: "seed-script",
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.LOW,
        metadata: { note: "Placeholder security event for development." },
      },
      {
        id: "seed-security-rate-limit",
        userId: null,
        ip: "unknown",
        userAgent: "seed-script",
        type: SecurityEventType.RATE_LIMIT_TRIGGERED,
        severity: SecuritySeverity.MEDIUM,
        metadata: { note: "Placeholder rate-limit event for development." },
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
