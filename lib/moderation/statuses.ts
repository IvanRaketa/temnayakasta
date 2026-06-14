import type { CommentStatus, PostStatus, ReportStatus, UserStatus } from "@/types/moderation";

export const postStatuses: PostStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "PENDING_REVIEW",
  "HIDDEN",
  "BLOCKED",
];

export const commentStatuses: CommentStatus[] = [
  "PUBLISHED",
  "PENDING_REVIEW",
  "HIDDEN",
  "BLOCKED",
];

export const userStatuses: UserStatus[] = ["ACTIVE", "LIMITED", "MUTED", "BANNED"];

export const reportStatuses: ReportStatus[] = ["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"];
