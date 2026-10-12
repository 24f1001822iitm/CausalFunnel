"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (url === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) {
          let message = `Request failed (${res.status})`;
          try {
            const body: unknown = await res.json();
            if (body && typeof body === "object" && "error" in body) {
              const e = (body as { error: unknown }).error;
              if (typeof e === "string" && e) message = e;
            }
          } catch {
            /* non-JSON error body */
          }
          throw new Error(message);
        }
        const json = (await res.json()) as T;
        if (!controller.signal.aborted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [url, nonce]);

  return { data, loading, error, refetch };
}
