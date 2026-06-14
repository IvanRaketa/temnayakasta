export const PREMIUM_NAME_EFFECTS = [
  {
    value: "none",
    label: "Без переливания",
    description: "Обычное отображение имени.",
  },
  {
    value: "aurora",
    label: "Северное сияние",
    description: "Холодное переливание через бирюзовый и золотой.",
  },
  {
    value: "ember",
    label: "Угольки",
    description: "Тёплый огненный перелив.",
  },
  {
    value: "violet",
    label: "Фиолетовый неон",
    description: "Контрастный неоновый перелив.",
  },
] as const;

export type PremiumNameEffect = (typeof PREMIUM_NAME_EFFECTS)[number]["value"];

const premiumNameEffectValues = new Set<string>(PREMIUM_NAME_EFFECTS.map((effect) => effect.value));

export function isPremiumActive(user?: { premiumUntil?: Date | string | null } | null) {
  if (!user?.premiumUntil) return false;
  const premiumUntil =
    user.premiumUntil instanceof Date ? user.premiumUntil : new Date(user.premiumUntil);

  return Number.isFinite(premiumUntil.getTime()) && premiumUntil > new Date();
}

export function normalizePremiumNameEffect(value: unknown): PremiumNameEffect {
  const effect = String(value ?? "none").trim();
  return premiumNameEffectValues.has(effect) ? (effect as PremiumNameEffect) : "none";
}

export function premiumFeatureAllowed(
  user: { premiumUntil?: Date | string | null } | null | undefined,
  effect: PremiumNameEffect,
) {
  return effect === "none" || isPremiumActive(user);
}
