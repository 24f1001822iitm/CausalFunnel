import type { NextRequest } from "next/server";
import { ensureIndexes, getEventsCollection } from "@/lib/events";
import { CORS_HEADERS, NO_STORE_HEADERS, errorResponse, json, optionsResponse } from "@/lib/http";
import type { HeatmapResponse } from "@/lib/types";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { ...CORS_HEADERS, ...NO_STORE_HEADERS };

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("url");
    if (!raw) return json({ error: "Missing url parameter" }, 400, HEADERS);
    const url = normalizeUrl(raw);
    if (!url) return json({ error: "Invalid url parameter" }, 400, HEADERS);

    await ensureIndexes();
    const col = await getEventsCollection();
    const filter = { url, type: "click" as const };
    const [total, docs] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter, {
          projection: { x: 1, y: 1, pageWidth: 1, pageHeight: 1, viewportWidth: 1, viewportHeight: 1 },
        })
        .sort({ timestamp: -1 })
        .limit(10000)
        .toArray(),
    ]);

    const points: HeatmapResponse["points"] = [];
    for (const d of docs) {
      if (typeof d.x !== "number" || typeof d.y !== "number") continue;
      const pageWidth = d.pageWidth ?? d.viewportWidth;
      const pageHeight = d.pageHeight ?? d.viewportHeight;
      if (!pageWidth || !pageHeight) continue;
      points.push({ x: d.x, y: d.y, pageWidth, pageHeight });
    }
    const body: HeatmapResponse = { url, total, points };
    return json(body, 200, HEADERS);
  } catch (err) {
    return errorResponse(err, HEADERS);
  }
}
