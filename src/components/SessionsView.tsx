"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SessionsResponse } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { formatDuration } from "@/lib/format";
import { Empty, ErrorBox, Loading } from "./States";
import { SessionList } from "./SessionList";
import { SessionTimeline } from "./SessionTimeline";
import styles from "./SessionsView.module.css";

export function SessionsView() {
  const { data, loading, error, refetch } = useFetch<SessionsResponse>("/api/sessions");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "events" | "duration">("recent");

  const sessions = useMemo(() => data?.sessions ?? [], [data]);

  // Automatically select first session if none selected
  useMemo(() => {
    if (!selectedId && sessions.length > 0) {
      setSelectedId(sessions[0].sessionId);
    }
  }, [sessions, selectedId]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    if (sessions.length === 0) return { totalSessions: 0, totalEvents: 0, avgDuration: "0s", clickRate: "0%" };
    const totalSessions = sessions.length;
    const totalEvents = sessions.reduce((acc, s) => acc + s.eventCount, 0);
    const totalClicks = sessions.reduce((acc, s) => acc + s.clicks, 0);
    const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);
    const avgDuration = formatDuration(Math.round(totalMs / totalSessions));
    const clickRate = totalEvents > 0 ? `${Math.round((totalClicks / totalEvents) * 100)}%` : "0%";
    return { totalSessions, totalEvents, avgDuration, clickRate };
  }, [sessions]);

  // Filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => s.sessionId.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sortBy === "events") return b.eventCount - a.eventCount;
      if (sortBy === "duration") return b.durationMs - a.durationMs;
      // Default: recent (by firstEvent timestamp)
      return new Date(b.firstEvent).getTime() - new Date(a.firstEvent).getTime();
    });
  }, [sessions, searchQuery, sortBy]);

  let listBody;
  if (loading && sessions.length === 0) {
    listBody = <Loading label="Retrieving session telemetry..." />;
  } else if (error) {
    listBody = <ErrorBox message={error} onRetry={refetch} />;
  } else if (sessions.length === 0) {
    listBody = (
      <Empty message="No visitor sessions captured yet. Visit the demo store to generate interactions.">
        <Link href="/demo" className={styles.ctaLink}>
          Open Demo Store
        </Link>
      </Empty>
    );
  } else {
    listBody = (
      <SessionList
        sessions={filteredSessions}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    );
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Sessions & User Journeys</h1>
          <p className={styles.subtitle}>
            Inspect real-time visitor interactions, sequential click pathways, and session durations.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={refetch}
            disabled={loading}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={loading ? styles.spinning : ""}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loading ? "Syncing..." : "Refresh Sessions"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Sessions</span>
            <strong className={styles.statValue}>{stats.totalSessions}</strong>
          </div>
          <span className={styles.statSub}>Tracked unique sessions</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Recorded Events</span>
            <strong className={styles.statValue}>{stats.totalEvents}</strong>
          </div>
          <span className={styles.statSub}>Clicks & page views combined</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Avg Session Duration</span>
            <strong className={styles.statValue}>{stats.avgDuration}</strong>
          </div>
          <span className={styles.statSub}>Time on tracked pages</span>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Interaction Ratio</span>
            <strong className={styles.statValue}>{stats.clickRate}</strong>
          </div>
          <span className={styles.statSub}>Ratio of clicks to all events</span>
        </div>
      </div>

      {/* Main Split Layout: Session Explorer & Journey Timeline */}
      <div className={styles.layout}>
        {/* Left Pane: Session Explorer */}
        <section className={styles.listPane} aria-label="Session list">
          <div className={styles.paneHeader}>
            <div className={styles.searchBar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search session ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={styles.clearSearch}
                >
                  ✕
                </button>
              )}
            </div>

            <div className={styles.sortGroup}>
              <span className={styles.sortLabel}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recent" | "events" | "duration")}
                className={styles.sortSelect}
              >
                <option value="recent">Recent</option>
                <option value="events">Events</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>

          <div className={styles.listContainer}>{listBody}</div>
        </section>

        {/* Right Pane: User Journey Timeline */}
        <section className={styles.timelinePane} aria-label="Session timeline" aria-live="polite">
          <SessionTimeline sessionId={selectedId} />
        </section>
      </div>
    </div>
  );
}
