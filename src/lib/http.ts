import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(
  body: T,
  status = 200,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, { status, headers });
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function errorResponse(
  err: unknown,
  headers: Record<string, string> = {},
): NextResponse {
  if (err instanceof ZodError) {
    return json(
      { error: "Invalid request", issues: err.issues },
      400,
      headers,
    );
  }
  if (err instanceof SyntaxError) {
    return json({ error: "Invalid JSON body" }, 400, headers);
  }
  if (err instanceof HttpError) {
    return json({ error: err.message }, err.status, headers);
  }
  console.error("[api] internal error:", err);
  return json({ error: "Internal error" }, 500, headers);
}
