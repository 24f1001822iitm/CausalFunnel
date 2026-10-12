import type { Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { EventDoc } from "@/types/events";

let indexesPromise: Promise<void> | null = null;

export async function getEventsCollection(): Promise<Collection<EventDoc>> {
  const db = await getDb();
  return db.collection<EventDoc>("events");
}

export function ensureIndexes(): Promise<void> {
  if (!indexesPromise) {
    const p = (async () => {
      const col = await getEventsCollection();
      await col.createIndexes([
        { key: { sessionId: 1, timestamp: 1 } },
        { key: { url: 1, type: 1 } },
        { key: { timestamp: -1 } },
      ]);
    })();
    indexesPromise = p;
    p.catch(() => {
      if (indexesPromise === p) indexesPromise = null;
    });
  }
  return indexesPromise;
}
