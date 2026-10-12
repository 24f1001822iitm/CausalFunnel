import { ensureIndexes, getEventsCollection } from "@/lib/events";
import { CORS_HEADERS, NO_STORE_HEADERS, errorResponse, json, optionsResponse } from "@/lib/http";
import type { PageSummary, PagesResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { ...CORS_HEADERS, ...NO_STORE_HEADERS };

export function OPTIONS() {
  return optionsResponse();
}

interface PageAgg {
  _id: string;
  views: number;
  clicks: number;
  lastSeen: Date;
}

export async function GET() {
  try {
    await ensureIndexes();
    const col = await getEventsCollection();
    const rows = await col
      .aggregate<PageAgg>([
        {
          $group: {
            _id: "$url",
            views: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ["$type", "click"] }, 1, 0] } },
            lastSeen: { $max: "$timestamp" },
          },
        },
        { $sort: { clicks: -1, views: -1, _id: 1 } },
        { $limit: 200 },
      ])
      .toArray();
    const pages: PageSummary[] = rows.map((r) => ({
      url: r._id,
      views: r.views,
      clicks: r.clicks,
      lastSeen: r.lastSeen.toISOString(),
    }));
    const body: PagesResponse = { pages };
    return json(body, 200, HEADERS);
  } catch (err) {
    return errorResponse(err, HEADERS);
  }
}
