import type { ModerationCheckResult, ModerationDecision } from "@/types/moderation";

export interface ModerationInput {
  authorId?: string;
  title?: string;
  body: string;
  links?: string[];
}

export interface ModerationResult {
  decision: ModerationDecision;
  checks: ModerationCheckResult[];
}

export async function evaluateContentForModeration(
  input: ModerationInput,
): Promise<ModerationResult> {
  void input;

  const checks: ModerationCheckResult[] = [
    { kind: "content_filter", decision: "allow" },
    { kind: "anti_spam", decision: "allow" },
    { kind: "rate_limit", decision: "allow" },
    { kind: "link_safety", decision: "allow" },
    { kind: "ai_review", decision: "allow" },
    { kind: "manual_review", decision: "allow" },
  ];

  return {
    decision: "allow",
    checks,
  };
}
