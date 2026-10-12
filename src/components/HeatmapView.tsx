"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HeatmapResponse, PagesResponse } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { pathOf } from "@/lib/format";
import { Empty, ErrorBox, Loading } from "./States";
import { HeatmapStage } from "./HeatmapStage";
import styles from "./HeatmapView.module.css";

export function HeatmapView() {
  const pagesReq = useFetch<PagesResponse>("/api/pages");
  const pagesData = pagesReq.data;
  const pages = useMemo(() => pagesData?.pages ?? [], [pagesData]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (pages.length > 0 && (selected === null || !pages.some((p) => p.url === selected))) {
      setSelected(pages[0].url);
    }
  }, [pages, selected]);

  const heatUrl = selected ? `/api/heatmap?url=${encodeURIComponent(selected)}` : null;
  const heat = useFetch<HeatmapResponse>(heatUrl);

  let body;
  if (pagesReq.loading) body = <Loading label="Loading pages..." />;
  else if (pagesReq.error) body = <ErrorBox message={pagesReq.error} onRetry={pagesReq.refetch} />;
  else if (pages.length === 0) {
    body = (
      <Empty message="No pages tracked yet">
        <Link href="/demo">Open the demo page</Link>
      </Empty>
    );
  } else {
    let map;
    if (heat.loading || (selected !== null && !heat.data && !heat.error)) map = <Loading label="Loading clicks..." />;
    else if (heat.error) map = <ErrorBox message={heat.error} onRetry={heat.refetch} />;
    else if (!heat.data || heat.data.points.length === 0) map = <Empty message="No clicks recorded for this page" />;
    else map = <HeatmapStage points={heat.data.points} />;

    body = (
      <>
        <div className={styles.controls}>
          <label htmlFor="page-select">Page</label>
          <select
            id="page-select"
            className={styles.select}
            value={selected ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.url} value={p.url}>
                {pathOf(p.url)} ({p.clicks} {p.clicks === 1 ? "click" : "clicks"})
              </option>
            ))}
          </select>
          <button type="button" className={styles.refresh} onClick={heat.refetch} disabled={heat.loading}>
            Refresh
          </button>
        </div>
        {selected && (
          <p className={styles.info}>
            <span className={styles.url}>{selected}</span>
            {heat.data && <strong>{heat.data.total} total clicks</strong>}
          </p>
        )}
        {map}
      </>
    );
  }

  return (
    <div>
      <h1>Click heatmap</h1>
      <div className={styles.panel}>{body}</div>
    </div>
  );
}
