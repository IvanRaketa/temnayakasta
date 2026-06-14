import { NextResponse } from "next/server";

import { activeAdvertisementWhere } from "@/lib/ads/get-active-ad";
import { shouldCountAdMetric } from "@/lib/ads/metrics-guard";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id && shouldCountAdMetric("impression", id, request.headers)) {
    await db.advertisement
      .updateMany({
        where: {
          id,
          ...activeAdvertisementWhere(),
        },
        data: {
          impressions: { increment: 1 },
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
