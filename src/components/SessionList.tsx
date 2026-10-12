"use client";

import { useState } from "react";
import type { SessionSummary } from "@/lib/types";
import { formatDuration, formatTime, shortId } from "@/lib/format";
import styles from "./SessionList.module.css";

interface Props {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SessionList({ sessions, selectedId, onSelect }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No matching sessions found.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {sessions.map((s) => {
        const isSelected = s.sessionId === selectedId;
        const total = s.pageViews + s.clicks;
        const viewPercent = total > 0 ? (s.pageViews / total) * 100 : 50;
        const clickPercent = total > 0 ? (s.clicks / total) * 100 : 50;

        return (
          <div
            key={s.sessionId}
            className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
            onClick={() => onSelect(s.sessionId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s.sessionId);
              }
            }}
            aria-pressed={isSelected}
          >
            {/* Top row: Session ID, Copy button, Duration */}
            <div className={styles.cardHeader}>
              <div className={styles.sessionMeta}>
                <span className={styles.userIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <code className={styles.sessionId} title={s.sessionId}>
                  {shortId(s.sessionId)}
                </code>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={(e) => handleCopy(e, s.sessionId)}
                  title="Copy full session ID"
                  aria-label="Copy session ID"
                >
                  {copiedId === s.sessionId ? (
                    <span className={styles.copiedBadge}>Copied!</span>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>

              <span className={styles.durationPill}>
                {formatDuration(s.durationMs)}
              </span>
            </div>

            {/* Middle: Event count and breakdown */}
            <div className={styles.cardMetrics}>
              <div className={styles.eventsBadge}>
                <strong>{s.eventCount}</strong> events
              </div>
              <div className={styles.detailStats}>
                <span className={styles.viewsCount}>
                  <span className={styles.dotView} />
                  {s.pageViews} {s.pageViews === 1 ? "view" : "views"}
                </span>
                <span className={styles.clicksCount}>
                  <span className={styles.dotClick} />
                  {s.clicks} {s.clicks === 1 ? "click" : "clicks"}
                </span>
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className={styles.ratioBar}>
              <div
                className={styles.ratioViews}
                style={{ width: `${viewPercent}%` }}
                title={`${s.pageViews} views (${Math.round(viewPercent)}%)`}
              />
              <div
                className={styles.ratioClicks}
                style={{ width: `${clickPercent}%` }}
                title={`${s.clicks} clicks (${Math.round(clickPercent)}%)`}
              />
            </div>

            {/* Footer: First seen timestamp */}
            <div className={styles.cardFooter}>
              <span className={styles.timeLabel}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatTime(s.firstEvent)}
              </span>
              <span className={styles.arrowIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
