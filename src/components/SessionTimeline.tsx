"use client";

import { useMemo, useState } from "react";
import type { EventDTO, SessionEventsResponse } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { formatTime, pathOf, relativeOffset, shortId } from "@/lib/format";
import { Empty, ErrorBox, Loading } from "./States";
import styles from "./SessionTimeline.module.css";

function sortEvents(events: EventDTO[]): EventDTO[] {
  return events
    .map((e, i) => ({ e, i, t: new Date(e.timestamp).getTime() }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((v) => v.e);
}

export function SessionTimeline({ sessionId }: { sessionId: string | null }) {
  const [filterType, setFilterType] = useState<"all" | "clicks" | "views">("all");
  const [copied, setCopied] = useState(false);

  const url = sessionId ? `/api/sessions/${encodeURIComponent(sessionId)}/events` : null;
  const { data, loading, error, refetch } = useFetch<SessionEventsResponse>(url);
  const events = useMemo(() => (data ? sortEvents(data.events) : []), [data]);

  const filteredEvents = useMemo(() => {
    if (filterType === "clicks") return events.filter((e) => e.type === "click");
    if (filterType === "views") return events.filter((e) => e.type === "page_view");
    return events;
  }, [events, filterType]);

  const handleCopy = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!sessionId) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.emptyIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h3>Select a Session</h3>
        <p>Choose any session on the left to inspect its sequential user journey.</p>
      </div>
    );
  }

  if (loading) return <Loading label="Loading journey events..." />;
  if (error) return <ErrorBox message={error} onRetry={refetch} />;
  if (events.length === 0) return <Empty message="This session has no recorded events." />;

  const firstTimestamp = events[0].timestamp;

  return (
    <div className={styles.timeline}>
      {/* Sticky Journey Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.titleInfo}>
            <span className={styles.journeyBadge}>USER JOURNEY</span>
            <div className={styles.sessionTitle}>
              Session <code className={styles.sessionCode}>{shortId(sessionId)}</code>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
                title="Copy full session ID"
              >
                {copied ? "Copied!" : "Copy ID"}
              </button>
            </div>
          </div>

          <div className={styles.headerPills}>
            <span className={styles.eventCountPill}>
              {events.length} {events.length === 1 ? "Event" : "Events"}
            </span>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={refetch}
              title="Refresh events"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Filter:</span>
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segBtn} ${filterType === "all" ? styles.segActive : ""}`}
              onClick={() => setFilterType("all")}
            >
              All ({events.length})
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${filterType === "views" ? styles.segActive : ""}`}
              onClick={() => setFilterType("views")}
            >
              Views ({events.filter((e) => e.type === "page_view").length})
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${filterType === "clicks" ? styles.segActive : ""}`}
              onClick={() => setFilterType("clicks")}
            >
              Clicks ({events.filter((e) => e.type === "click").length})
            </button>
          </div>
        </div>
      </div>

      {/* Sequential Event Tree */}
      <div className={styles.listContainer}>
        <ol className={styles.list}>
          {filteredEvents.map((ev, i) => {
            const isClick = ev.type === "click";
            const timeOffset = relativeOffset(ev.timestamp, firstTimestamp);

            return (
              <li key={ev.id} className={styles.item}>
                <div className={styles.node}>
                  <span className={`${styles.nodeCircle} ${isClick ? styles.nodeClick : styles.nodeView}`}>
                    {i + 1}
                  </span>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.typeBadge} ${isClick ? styles.badgeClick : styles.badgeView}`}>
                        {isClick ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                          </svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                        <span>{ev.type}</span>
                      </span>

                      <span className={styles.path} title={ev.url}>
                        {pathOf(ev.url)}
                      </span>
                    </div>

                    <span className={styles.offsetBadge}>{timeOffset}</span>
                  </div>

                  {/* Metadata Row */}
                  <div className={styles.cardMeta}>
                    <time dateTime={ev.timestamp} className={styles.timeTag}>
                      {formatTime(ev.timestamp)}
                    </time>

                    {isClick && ev.x !== undefined && ev.y !== undefined && (
                      <span className={styles.coordBadge}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        X: {Math.round(ev.x)}px, Y: {Math.round(ev.y)}px
                      </span>
                    )}

                    {isClick && ev.target && (
                      <span className={styles.targetBadge} title={ev.target}>
                        Element: <code>{ev.target}</code>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
