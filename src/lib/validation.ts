import { z } from "zod";
import { HttpError } from "@/lib/http";
import { normalizeUrl } from "@/lib/url";
import type { EventDoc } from "@/types/events";

export const MAX_BODY_BYTES = 10 * 1024;
export const MAX_BATCH = 50;
export const SESSION_ID_RE = /^[\w-]+$/;
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export const sessionIdSchema = z.string().min(8).max(64).regex(SESSION_ID_RE);

const coord = z.number().finite().min(0).max(100000);
const optDim = z.number().finite().min(0).max(1000000).optional();

const httpUrl = z
  .string()
  .max(2048)
  .refine((v) => normalizeUrl(v) !== null, "Invalid http(s) URL");

const eventSchema = z
  .object({
    session_id: sessionIdSchema,
    type: z.enum(["page_view", "click"]),
    url: httpUrl,
    timestamp: z.union([z.number(), z.string()]).optional(),
    x: coord.optional(),
    y: coord.optional(),
    vw: optDim,
    vh: optDim,
    pw: optDim,
    ph: optDim,
    target: z.string().optional(),
  })
  .strip()
  .superRefine((ev, ctx) => {
    if (ev.type === "click") {
      if (ev.x === undefined) {
        ctx.addIssue({ code: "custom", path: ["x"], message: "x required for click" });
      }
      if (ev.y === undefined) {
        ctx.addIssue({ code: "custom", path: ["y"], message: "y required for click" });
      }
    }
  });

const bodySchema = z.union([
  z.object({ events: z.array(eventSchema).min(1).max(MAX_BATCH) }),
  eventSchema,
]);

type RawEvent = z.infer<typeof eventSchema>;

function resolveTimestamp(raw: number | string | undefined, now: Date): Date {
  if (raw === undefined) return now;
  const d = typeof raw === "number" ? new Date(raw) : new Date(raw);
  const t = d.getTime();
  if (Number.isNaN(t) || t > now.getTime() + FUTURE_SKEW_MS) return now;
  return d;
}

function toDoc(ev: RawEvent, userAgent: string | undefined, now: Date): EventDoc {
  const url = normalizeUrl(ev.url);
  if (!url) throw new HttpError(400, "Invalid url");
  const doc: EventDoc = {
    sessionId: ev.session_id,
    type: ev.type,
    url,
    rawUrl: ev.url,
    timestamp: resolveTimestamp(ev.timestamp, now),
    receivedAt: now,
  };
  if (ev.type === "click") {
    doc.x = Math.round(ev.x ?? 0);
    doc.y = Math.round(ev.y ?? 0);
    if (ev.pw !== undefined) doc.pageWidth = Math.round(ev.pw);
    if (ev.ph !== undefined) doc.pageHeight = Math.round(ev.ph);
    if (ev.vw !== undefined) doc.viewportWidth = Math.round(ev.vw);
    if (ev.vh !== undefined) doc.viewportHeight = Math.round(ev.vh);
    if (ev.target) doc.target = ev.target.slice(0, 100);
  }
  if (userAgent) doc.userAgent = userAgent.slice(0, 512);
  return doc;
}

/** Reads, size-checks and validates a tracker request body into EventDocs. */
export async function parseEventsRequest(req: Request): Promise<EventDoc[]> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new HttpError(413, "Payload too large");
  }
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new HttpError(413, "Payload too large");
  }
  const parsed: unknown = JSON.parse(text);
  const body = bodySchema.parse(parsed);
  const list = "events" in body ? body.events : [body];
  const now = new Date();
  const ua = req.headers.get("user-agent") ?? undefined;
  return list.map((ev) => toDoc(ev, ua, now));
}
