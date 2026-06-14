export type ContentFilterDecision = "ALLOW" | "PENDING_REVIEW" | "BLOCK";

export interface ContentFilterInput {
  kind: "post" | "comment" | "profile" | "username" | "displayName" | "tag";
  text: string;
  recentTexts?: string[];
}

export interface ContentFilterResult {
  decision: ContentFilterDecision;
  reasons: string[];
}

type ModerationRule = {
  decision: ContentFilterDecision;
  reason: string;
  terms?: string[];
  patterns?: RegExp[];
};

const linkForbiddenKinds = new Set<ContentFilterInput["kind"]>(["post", "comment", "profile"]);

const htmlMediaPattern = /<(?:iframe|video|embed|object|source)\b/iu;
const htmlAttributePattern = /\b(?:href|src|poster|data|action)=["']([^"']+)["']/giu;
const urlPattern =
  /(?:https?:\/\/|www\.|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:ru|рф|com|net|org|su|biz|info|online|site|shop|xyz|io|me|app|dev|pro|club|store|link|click|top)(?:\/|\b)|(?:t(?:elegram)?\.me|vk\.com|vkvideo\.ru|youtu\.be|youtube\.com|rutube\.ru|dzen\.ru|boosty\.to|taplink\.cc|linktr\.ee)\/)/iu;
const phonePattern = /(?:\+7|8)[\s().-]*\d{3}[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/u;

const latinLookalikes: Record<string, string> = {
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
};

const leetLookalikes: Record<string, string> = {
  "0": "о",
  "1": "и",
  "3": "е",
  "4": "а",
  "5": "с",
  "6": "б",
  "@": "а",
  $: "с",
};

const blockingRules: ModerationRule[] = [
  {
    reason: "offensive_language",
    decision: "BLOCK",
    terms: [
      "идиот",
      "дебил",
      "долбо",
      "дурак",
      "кретин",
      "мраз",
      "сволоч",
      "скотин",
      "тварь",
      "тупиц",
      "тупой",
      "ублюд",
      "урод",
      "чмо",
      "шлюх",
      "бля",
      "гандон",
      "еба",
      "ебан",
      "пидар",
      "пидор",
      "пизд",
      "сука",
      "суч",
      "уеб",
      "уёб",
      "хер",
      "хуе",
      "хуй",
    ],
  },
  {
    reason: "advertising_not_allowed",
    decision: "BLOCK",
    terms: [
      "casino",
      "viagra",
      "казино",
      "букмекер",
      "ставки на спорт",
      "промокод",
      "партнерская ссылка",
      "реферальная ссылка",
      "распродажа",
      "скидка",
      "купите",
      "закажите",
      "пишите в лс",
      "прайс",
      "оптом",
      "подписывайтесь на канал",
      "подписывайтесь в",
    ],
    patterns: [
      /(?:^|\s)(?:куплю|продам|продаю|закажи|заказывай|доставка|акция)\b/iu,
      /\b(?:цена|стоимость)\s*\d+/iu,
      /\b\d+\s*(?:руб|₽|р\.)\b/iu,
    ],
  },
  {
    reason: "adult_or_sexual_services",
    decision: "BLOCK",
    terms: ["porn", "порно", "порнограф", "интим услуги", "эскорт", "проститут"],
  },
  {
    reason: "child_safety_prohibited",
    decision: "BLOCK",
    terms: [
      "детское порно",
      "детская порнография",
      "несовершеннолетн porn",
      "секс с несовершеннолет",
    ],
  },
  {
    reason: "drugs_prohibited",
    decision: "BLOCK",
    terms: [
      "наркотик",
      "психотроп",
      "закладк",
      "кладмен",
      "мефедрон",
      "героин",
      "кокаин",
      "амфетамин",
      "метамфетамин",
      "лсд",
      "спайс",
      "гашиш",
      "марихуан",
      "каннабис",
      "сбыт веществ",
      "места приобретения наркот",
    ],
  },
  {
    reason: "self_harm_prohibited",
    decision: "BLOCK",
    terms: [
      "способы суицида",
      "инструкция суицида",
      "как покончить с собой",
      "призыв к суициду",
      "склонение к самоубийству",
      "группа смерти",
    ],
  },
  {
    reason: "extremism_or_terrorism_prohibited",
    decision: "BLOCK",
    terms: [
      "призыв к терроризму",
      "участие в террористической деятельности",
      "экстремистская деятельность",
      "разжигание розни",
      "массовые беспорядки",
      "призыв к беспорядкам",
      "вербовка в террорист",
      "игил",
      "isis",
    ],
  },
  {
    reason: "weapons_or_explosives_prohibited",
    decision: "BLOCK",
    terms: [
      "самодельная взрывчатка",
      "самодельное взрывное устройство",
      "как сделать бомбу",
      "изготовить бомбу",
      "переделка оружия",
      "изготовление оружия",
    ],
  },
  {
    reason: "illegal_trade_or_fraud",
    decision: "BLOCK",
    terms: [
      "поддельный паспорт",
      "купить паспорт",
      "купить права",
      "поддельные права",
      "поддельный диплом",
      "слив базы",
      "пробив по номеру",
      "кардинг",
      "фишинг",
      "скам",
    ],
  },
  {
    reason: "regulated_goods_prohibited",
    decision: "BLOCK",
    terms: [
      "продажа алкоголя онлайн",
      "доставка алкоголя",
      "купить алкоголь ночью",
      "купить вейп",
      "табак доставка",
    ],
  },
];

const reviewRules: ModerationRule[] = [
  {
    reason: "sensitive_legal_topic",
    decision: "PENDING_REVIEW",
    terms: [
      "суицид",
      "самоубийств",
      "терроризм",
      "террорист",
      "экстремизм",
      "экстремист",
      "взрывчат",
      "оружие",
      "наркот",
      "психотроп",
    ],
  },
];

const reasonMessages: Record<string, string> = {
  links_not_allowed: "Ссылки в публикациях и комментариях запрещены.",
  embedded_media_not_allowed: "Встраиваемые видео и внешние медиа запрещены.",
  advertising_not_allowed: "Реклама и продвижение в пользовательских материалах запрещены.",
  offensive_language: "Оскорбления, мат и травля запрещены.",
  adult_or_sexual_services: "Сексуальный контент и интим-услуги запрещены.",
  child_safety_prohibited:
    "Материал относится к запрещённому контенту с участием несовершеннолетних.",
  drugs_prohibited: "Материалы о наркотиках и местах их приобретения запрещены.",
  self_harm_prohibited: "Инструкции и призывы к самоубийству или самоповреждению запрещены.",
  extremism_or_terrorism_prohibited:
    "Экстремистские, террористические материалы и призывы к беспорядкам запрещены.",
  weapons_or_explosives_prohibited:
    "Инструкции по изготовлению оружия или взрывчатых веществ запрещены.",
  illegal_trade_or_fraud: "Мошенничество, фишинг и торговля поддельными документами запрещены.",
  regulated_goods_prohibited: "Незаконная дистанционная продажа регулируемых товаров запрещена.",
  sensitive_legal_topic: "Материал содержит чувствительную тему и отправлен на модерацию.",
  too_many_links: "Слишком много ссылок.",
  many_links: "Материал содержит много ссылок.",
  repeated_characters: "Материал похож на спам.",
  duplicate_recent_text: "Повторяющийся материал отправлен на модерацию.",
  low_signal_text: "Материал слишком короткий или неинформативный.",
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function collectHtmlAttributeValues(value: string) {
  return Array.from(value.matchAll(htmlAttributePattern), (match) => match[1]).join(" ");
}

function normalizeBasic(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/ё/g, "е");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function foldLookalikes(value: string, map: Record<string, string>) {
  return Array.from(value, (char) => map[char] ?? char).join("");
}

function createScanText(value: string) {
  const normalized = normalizeBasic(value);
  const visibleText = stripHtml(normalized);
  const attributes = normalizeBasic(collectHtmlAttributeValues(value));
  const spaced = `${visibleText} ${attributes}`;
  const compact = spaced.replace(/[^\p{Letter}\p{Number}@#$]+/gu, "");
  const foldedLatin = foldLookalikes(compact, latinLookalikes);
  const foldedLeet = foldLookalikes(foldedLatin, leetLookalikes);

  return `${spaced}\n${compact}\n${foldedLatin}\n${foldedLeet}`;
}

function countLinks(text: string) {
  const matches = text.match(new RegExp(urlPattern.source, "giu")) ?? [];
  const phoneMatches = text.match(new RegExp(phonePattern.source, "gu")) ?? [];
  return matches.length + phoneMatches.length;
}

function hasLink(text: string) {
  return urlPattern.test(text) || phonePattern.test(text);
}

function hasTermMatch(text: string, term: string) {
  const normalized = normalizeBasic(term);

  if (normalized.includes(" ") || normalized.length > 4) {
    return text.includes(normalized);
  }

  return new RegExp(
    `(^|[^\\p{Letter}\\p{Number}])${escapeRegExp(normalized)}(?=$|[^\\p{Letter}\\p{Number}])`,
    "iu",
  ).test(text);
}

function hasRuleMatch(rule: ModerationRule, text: string) {
  const terms = rule.terms ?? [];

  return (
    terms.some((term) => hasTermMatch(text, term)) ||
    (rule.patterns ?? []).some((pattern) => pattern.test(text))
  );
}

function addDecision(
  current: ContentFilterDecision,
  next: ContentFilterDecision,
): ContentFilterDecision {
  if (current === "BLOCK" || next === "BLOCK") return "BLOCK";
  if (current === "PENDING_REVIEW" || next === "PENDING_REVIEW") return "PENDING_REVIEW";
  return "ALLOW";
}

function hasRepeatedCharacters(text: string) {
  return /(.)\1{12,}/u.test(text);
}

function hasLowSignalText(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (compact.length === 0) return true;
  if (compact.length < 3 && !/[а-яa-z0-9]/i.test(compact)) return true;
  return false;
}

function normalizeComparableText(text: string) {
  return stripHtml(normalizeBasic(text)).trim().replace(/\s+/g, " ");
}

function hasDuplicateRecentText(text: string, recentTexts: string[] = []) {
  const normalized = normalizeComparableText(text);
  if (normalized.length < 12) return false;
  return recentTexts.filter((item) => normalizeComparableText(item) === normalized).length >= 2;
}

export function evaluateContentFilter(input: ContentFilterInput): ContentFilterResult {
  const text = createScanText(input.text);
  const visibleText = normalizeComparableText(input.text);
  const reasons: string[] = [];
  let decision: ContentFilterDecision = "ALLOW";

  if (linkForbiddenKinds.has(input.kind) && hasLink(text)) {
    reasons.push("links_not_allowed");
    decision = "BLOCK";
  }

  if ((input.kind === "post" || input.kind === "comment") && htmlMediaPattern.test(input.text)) {
    reasons.push("embedded_media_not_allowed");
    decision = "BLOCK";
  }

  for (const rule of blockingRules) {
    if (hasRuleMatch(rule, text)) {
      reasons.push(rule.reason);
      decision = addDecision(decision, rule.decision);
    }
  }

  for (const rule of reviewRules) {
    if (hasRuleMatch(rule, text)) {
      reasons.push(rule.reason);
      decision = addDecision(decision, rule.decision);
    }
  }

  const links = countLinks(text);
  if (links > 10) {
    reasons.push("too_many_links");
    decision = "BLOCK";
  } else if (!linkForbiddenKinds.has(input.kind) && links > 4) {
    reasons.push("many_links");
    if (decision === "ALLOW") decision = "PENDING_REVIEW";
  }

  if (hasRepeatedCharacters(visibleText)) {
    reasons.push("repeated_characters");
    if (decision === "ALLOW") decision = "PENDING_REVIEW";
  }

  if (
    (input.kind === "post" || input.kind === "comment") &&
    hasDuplicateRecentText(visibleText, input.recentTexts)
  ) {
    reasons.push("duplicate_recent_text");
    if (decision === "ALLOW") decision = "PENDING_REVIEW";
  }

  if ((input.kind === "post" || input.kind === "comment") && hasLowSignalText(visibleText)) {
    reasons.push("low_signal_text");
    if (decision === "ALLOW") decision = "PENDING_REVIEW";
  }

  return { decision, reasons };
}

export function combineFilterResults(results: ContentFilterResult[]): ContentFilterResult {
  const reasons = Array.from(new Set(results.flatMap((result) => result.reasons)));
  if (results.some((result) => result.decision === "BLOCK")) return { decision: "BLOCK", reasons };
  if (results.some((result) => result.decision === "PENDING_REVIEW")) {
    return { decision: "PENDING_REVIEW", reasons };
  }
  return { decision: "ALLOW", reasons };
}

export function getContentFilterMessage(result: ContentFilterResult) {
  const firstReason = result.reasons[0];

  if (firstReason && reasonMessages[firstReason]) {
    return reasonMessages[firstReason];
  }

  if (result.decision === "PENDING_REVIEW") {
    return "Материал отправлен на модерацию.";
  }

  return "Материал нарушает правила сайта. Измените текст и попробуйте снова.";
}
