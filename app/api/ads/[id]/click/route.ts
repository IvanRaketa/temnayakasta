import { NextResponse } from "next/server";

import { activeAdvertisementWhere } from "@/lib/ads/get-active-ad";
import { shouldCountAdMetric } from "@/lib/ads/metrics-guard";
import { getSafeAdRedirectUrl } from "@/lib/ads/url";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallbackUrl = new URL("/", request.url);

  if (!id) {
    return NextResponse.redirect(fallbackUrl);
  }

  const ad = await db.advertisement.findFirst({
    where: {
      id,
      ...activeAdvertisementWhere(),
    },
    select: {
      id: true,
      targetUrl: true,
      erid: true,
    },
  });
  const redirectUrl = ad ? getSafeAdRedirectUrl(ad.targetUrl, ad.erid) : null;

  if (!ad || !redirectUrl) {
    return NextResponse.redirect(fallbackUrl);
  }

  if (shouldCountAdMetric("click", ad.id, request.headers)) {
    await db.advertisement
      .update({
        where: { id: ad.id },
        data: { clicks: { increment: 1 } },
        select: { id: true },
      })
      .catch(() => null);
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
