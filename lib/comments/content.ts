import sanitizeHtml from "sanitize-html";

export const COMMENT_MAX_LENGTH = 2_000;
export const DELETED_COMMENT_TEXT = "Комментарий удалён";

export function sanitizeCommentContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  })
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
