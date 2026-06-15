import { AdCard } from "@/components/ads/ad-card";
import { AdImpressionTracker } from "@/components/ads/ad-impression-tracker";
import { getActiveAd } from "@/lib/ads/get-active-ad";
import { type AdPlacement } from "@/lib/generated/prisma/client";
import { isPremiumActive } from "@/lib/premium";

type AdSlotUser = Parameters<typeof isPremiumActive>[0];

export async function AdSlot({
  placement,
  currentUser,
  compact = false,
}: {
  placement: AdPlacement;
  currentUser?: AdSlotUser;
  compact?: boolean;
}) {
  if (isPremiumActive(currentUser)) return null;

  try {
    const ad = await getActiveAd(placement);
    if (!ad) return null;

    return (
      <AdImpressionTracker adId={ad.id}>
        <AdCard ad={ad} compact={compact} />
      </AdImpressionTracker>
    );
  } catch (error) {
    console.error("Failed to load advertisement slot.", error);
    return null;
  }
}
