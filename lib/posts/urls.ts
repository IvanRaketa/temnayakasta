export interface PostUrlSource {
  id?: string | null;
  title: string;
  slug: string;
}

const POST_ID_SUFFIX_PATTERN = /--([a-z0-9]{10,})$/i;

const transliterationMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function transliterateToLatin(value: string) {
  return Array.from(value.toLowerCase(), (char) => transliterationMap[char] ?? char).join("");
}

export function createLatinSlug(value: string, fallback = "post") {
  const slug = transliterateToLatin(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || fallback;
}

export function getPostPublicSlug(post: PostUrlSource) {
  if (!post.id) return createLatinSlug(post.title || post.slug);

  return `${createLatinSlug(post.title || post.slug)}--${post.id.toLowerCase()}`;
}

export function getPostPath(post: PostUrlSource) {
  return `/post/${getPostPublicSlug(post)}`;
}

export function getPostEditPath(post: PostUrlSource) {
  return `${getPostPath(post)}/edit`;
}

export function getPostIdFromPublicSlug(slug: string) {
  return slug.match(POST_ID_SUFFIX_PATTERN)?.[1] ?? null;
}
