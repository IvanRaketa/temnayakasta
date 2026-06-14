export const MAX_TAGS_PER_POST = 8;
export const MAX_TAG_LENGTH = 32;

export function slugifyTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTagName(value: string) {
  return value
    .trim()
    .replace(/[#,;]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTags(values: string[]) {
  const bySlug = new Map<string, { name: string; slug: string }>();

  for (const value of values) {
    const name = normalizeTagName(value);
    const slug = slugifyTag(name);

    if (!name || !slug) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { name, slug });
    }
    if (bySlug.size >= MAX_TAGS_PER_POST) break;
  }

  return Array.from(bySlug.values());
}
