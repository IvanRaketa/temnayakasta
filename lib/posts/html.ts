import sanitizeHtml from "sanitize-html";

const POST_HTML_ALLOWED_TAGS = [
  "p",
  "strong",
  "em",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "br",
  "img",
];

function isAllowedPostImageSrc(src: string) {
  try {
    const url = new URL(src.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: POST_HTML_ALLOWED_TAGS,
    allowedAttributes: {
      img: ["src", "alt", "title", "class"],
      code: ["class"],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: {
      img: ["https"],
    },
    allowProtocolRelative: false,
    exclusiveFilter(frame) {
      if (frame.tag === "img") {
        const src = String(frame.attribs.src ?? "");
        return !isAllowedPostImageSrc(src);
      }

      return false;
    },
  });
}

export function createPostExcerpt(html: string, maxLength = 180): string {
  const text = sanitizePostHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

export function getFirstPostImageSrc(html: string): string | null {
  const match = sanitizePostHtml(html).match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);

  return match?.[1] ?? null;
}
