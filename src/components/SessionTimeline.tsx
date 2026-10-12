"use client";

import { useMemo } from "react";
import type { EventDTO, SessionEventsResponse } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { formatTime, pathOf, relativeOffset, shortId } from "@/lib/format";
import { Empty, ErrorBox, Loading } from "./States";
import styles from "./SessionTimeline.module.css";

function sortEvents(events: EventDTO[]): EventDTO[] {
  return events
    .map((e, i) => ({ e, i, t: new Date(e.timestamp).getTime() }))
    .sort((a, b) => (a.t - b.t) || (a.i - b.i))
    .map((v) => v.e);
}

export function SessionTimeline({ sessionId }: { sessionId: string | null }) {
  const url = sessionId ? `/api/sessions/${encodeURIComponent(sessionId)}/events` : null;
  const { data, loading, error, refetch } = useFetch<SessionEventsResponse>(url);
  const events = useMemo(() => (data ? sortEvents(data.events) : []), [data]);

  if (!sessionId) {
    return <Empty message="Select a session to see the user journey" />;
  }
  if (loading) return <Loading label="Loading events..." />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (events.length === 0) return <Empty message="This session has no events." />;

  const first = events[0].timestamp;
  return (
    <div>
      <h2 className={styles.heading}>
        Session <code>{shortId(sessionId)}</code>
        <span className={styles.count}>{events.length} events</span>
      </h2>
      <ol className={styles.list}>
        {events.map((ev, i) => (
          <li key={ev.id} className={styles.item}>
            <span className={styles.index} aria-hidden="true">{i + 1}</span>
            <div className={styles.body}>
              <div className={styles.row}>
                <span className={`${styles.badge} ${ev.type === "click" ? styles.click : styles.view}`}>
                  {ev.type}
                </span>
                <span className={styles.path} title={ev.url}>{pathOf(ev.url)}</span>
              </div>
              <div className={styles.meta}>
                <time dateTime={ev.timestamp}>{formatTime(ev.timestamp)}</time>
                <span>{relativeOffset(ev.timestamp, first)}</span>
                {ev.type === "click" && ev.x !== undefined && ev.y !== undefined && (
                  <span>({Math.round(ev.x)}, {Math.round(ev.y)})</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
