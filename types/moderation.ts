export type PostStatus = "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" | "HIDDEN" | "BLOCKED";

export type CommentStatus = "PUBLISHED" | "PENDING_REVIEW" | "HIDDEN" | "BLOCKED";

export type UserStatus = "ACTIVE" | "LIMITED" | "MUTED" | "BANNED";

export type ReportStatus = "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";

export type ModerationCheckKind =
  | "content_filter"
  | "anti_spam"
  | "rate_limit"
  | "link_safety"
  | "ai_review"
  | "manual_review";

export type ModerationDecision = "allow" | "review" | "hide" | "block";

export interface ModerationCheckResult {
  kind: ModerationCheckKind;
  decision: ModerationDecision;
  reason?: string;
}
