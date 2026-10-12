import { ensureIndexes, getEventsCollection } from "@/lib/events";
import { CORS_HEADERS, NO_STORE_HEADERS, errorResponse, json, optionsResponse } from "@/lib/http";
import type { EventDTO, SessionEventsResponse } from "@/lib/types";
import { sessionIdSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { ...CORS_HEADERS, ...NO_STORE_HEADERS };

export function OPTIONS() {
  return optionsResponse();
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const parsed = sessionIdSchema.safeParse(id);
    if (!parsed.success) {
      return json({ error: "Invalid session id" }, 400, HEADERS);
    }
    await ensureIndexes();
    const col = await getEventsCollection();
    const docs = await col
      .find({ sessionId: parsed.data })
      .sort({ timestamp: 1, _id: 1 })
      .limit(5000)
      .toArray();

    const events: EventDTO[] = docs.map((d) => {
      const e: EventDTO = {
        id: d._id ? d._id.toString() : "",
        type: d.type,
        url: d.url,
        timestamp: d.timestamp.toISOString(),
      };
      if (d.x !== undefined) e.x = d.x;
      if (d.y !== undefined) e.y = d.y;
      if (d.pageWidth !== undefined) e.pageWidth = d.pageWidth;
      if (d.pageHeight !== undefined) e.pageHeight = d.pageHeight;
      if (d.viewportWidth !== undefined) e.viewportWidth = d.viewportWidth;
      if (d.viewportHeight !== undefined) e.viewportHeight = d.viewportHeight;
      if (d.target !== undefined) e.target = d.target;
      return e;
    });
    const body: SessionEventsResponse = { sessionId: parsed.data, events };
    return json(body, 200, HEADERS);
  } catch (err) {
    return errorResponse(err, HEADERS);
  }
}
