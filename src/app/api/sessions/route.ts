import type { NextRequest } from "next/server";
import { ensureIndexes, getEventsCollection } from "@/lib/events";
import { CORS_HEADERS, NO_STORE_HEADERS, errorResponse, json, optionsResponse } from "@/lib/http";
import type { SessionSummary, SessionsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { ...CORS_HEADERS, ...NO_STORE_HEADERS };

export function OPTIONS() {
  return optionsResponse();
}

function intParam(v: string | null, def: number, min: number, max: number): number {
  const n = v === null ? NaN : Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

interface SessionAgg {
  _id: string;
  eventCount: number;
  pageViews: number;
  clicks: number;
  firstEvent: Date;
  lastEvent: Date;
  pageCount: number;
  durationMs: number;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = intParam(sp.get("limit"), 50, 1, 200);
    const page = intParam(sp.get("page"), 1, 1, 100000);
    const skip = sp.has("skip") ? intParam(sp.get("skip"), 0, 0, 1000000) : (page - 1) * limit;

    await ensureIndexes();
    const col = await getEventsCollection();
    const rows = await col
      .aggregate<SessionAgg>([
        {
          $group: {
            _id: "$sessionId",
            eventCount: { $sum: 1 },
            pageViews: { $sum: { $cond: [{ $eq: ["$type", "page_view"] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ["$type", "click"] }, 1, 0] } },
            firstEvent: { $min: "$timestamp" },
            lastEvent: { $max: "$timestamp" },
            pages: { $addToSet: "$url" },
          },
        },
        {
          $addFields: {
            pageCount: { $size: "$pages" },
            durationMs: { $subtract: ["$lastEvent", "$firstEvent"] },
          },
        },
        { $project: { pages: 0 } },
        { $sort: { lastEvent: -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    const sessions: SessionSummary[] = rows.map((r) => ({
      sessionId: r._id,
      eventCount: r.eventCount,
      pageViews: r.pageViews,
      clicks: r.clicks,
      firstEvent: r.firstEvent.toISOString(),
      lastEvent: r.lastEvent.toISOString(),
      durationMs: r.durationMs,
      pageCount: r.pageCount,
    }));
    const body: SessionsResponse = { sessions };
    return json(body, 200, HEADERS);
  } catch (err) {
    return errorResponse(err, HEADERS);
  }
}
