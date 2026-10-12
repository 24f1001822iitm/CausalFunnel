"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionsResponse } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { Empty, ErrorBox, Loading } from "./States";
import { SessionList } from "./SessionList";
import { SessionTimeline } from "./SessionTimeline";
import styles from "./SessionsView.module.css";

export function SessionsView() {
  const { data, loading, error, refetch } = useFetch<SessionsResponse>("/api/sessions");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sessions = data?.sessions ?? [];

  let listBody;
  if (loading) listBody = <Loading label="Loading sessions..." />;
  else if (error) listBody = <ErrorBox message={error} onRetry={refetch} />;
  else if (sessions.length === 0) {
    listBody = (
      <Empty message="No sessions yet. Open the demo page to generate events.">
        <Link href="/demo">Open demo page</Link>
      </Empty>
    );
  } else {
    listBody = <SessionList sessions={sessions} selectedId={selectedId} onSelect={setSelectedId} />;
  }

  return (
    <div>
      <div className={styles.titleRow}>
        <h1>Sessions</h1>
        <button type="button" className={styles.refresh} onClick={refetch} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className={styles.layout}>
        <section className={styles.pane} aria-label="Session list">{listBody}</section>
        <section className={styles.pane} aria-label="Session timeline" aria-live="polite">
          <SessionTimeline sessionId={selectedId} />
        </section>
      </div>
    </div>
  );
}
