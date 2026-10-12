import { CORS_HEADERS, errorResponse, json, optionsResponse } from "@/lib/http";
import { ensureIndexes, getEventsCollection } from "@/lib/events";
import { parseEventsRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(req: Request) {
  try {
    const docs = await parseEventsRequest(req);
    await ensureIndexes();
    const col = await getEventsCollection();
    const res = await col.insertMany(docs, { ordered: false });
    return json({ ok: true, inserted: res.insertedCount }, 201, CORS_HEADERS);
  } catch (err) {
    return errorResponse(err, CORS_HEADERS);
  }
}
