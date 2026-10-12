"use client";

import type { SessionSummary } from "@/lib/types";
import { formatDuration, formatTime, shortId } from "@/lib/format";
import styles from "./SessionList.module.css";

interface Props {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SessionList({ sessions, selectedId, onSelect }: Props) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Recorded sessions</caption>
        <thead>
          <tr>
            <th scope="col">Session</th>
            <th scope="col">Events</th>
            <th scope="col">First seen</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const selected = s.sessionId === selectedId;
            return (
              <tr
                key={s.sessionId}
                className={selected ? styles.selected : undefined}
                aria-selected={selected}
              >
                <td>
                  <button
                    type="button"
                    className={styles.pick}
                    onClick={() => onSelect(s.sessionId)}
                    aria-pressed={selected}
                    title={s.sessionId}
                  >
                    <code>{shortId(s.sessionId)}</code>
                  </button>
                </td>
                <td>
                  <strong>{s.eventCount}</strong>
                  <span className={styles.sub}>
                    {s.pageViews} views, {s.clicks} clicks
                  </span>
                </td>
                <td>{formatTime(s.firstEvent)}</td>
                <td>{formatDuration(s.durationMs)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
