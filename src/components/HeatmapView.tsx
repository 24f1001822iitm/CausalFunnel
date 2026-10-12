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

  // Heatmap interactive control states
  const [viewMode, setViewMode] = useState<"hybrid" | "thermal" | "points">("hybrid");
  const [zoomMode, setZoomMode] = useState<"fit" | "100" | "75" | "50">("fit");
  const [bgMode, setBgMode] = useState<"wireframe" | "grid" | "clean">("wireframe");
  const [intensity, setIntensity] = useState<number>(0.75);
  const [radius, setRadius] = useState<number>(26);

  useEffect(() => {
    if (pages.length > 0 && (selected === null || !pages.some((p) => p.url === selected))) {
      setSelected(pages[0].url);
    }
  }, [pages, selected]);

  const heatUrl = selected ? `/api/heatmap?url=${encodeURIComponent(selected)}` : null;
  const heat = useFetch<HeatmapResponse>(heatUrl);

  const selectedPageSummary = useMemo(
    () => pages.find((p) => p.url === selected),
    [pages, selected],
  );

  // Compute Heatmap KPI metrics
  const metrics = useMemo(() => {
    if (!heat.data || heat.data.points.length === 0) {
      return { total: 0, aboveFoldPercent: 0, avgDepth: 0, topArea: "N/A" };
    }
    const points = heat.data.points;
    const total = heat.data.total;
    const aboveFold = points.filter((p) => p.y < 800).length;
    const aboveFoldPercent = Math.round((aboveFold / points.length) * 100);

    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    const avgDepth = Math.round(sumY / points.length);

    let topArea = "Hero & CTA";
    if (avgDepth > 1000) topArea = "Lower Sections";
    else if (avgDepth > 500) topArea = "Middle Features";

    return { total, aboveFoldPercent, avgDepth, topArea };
  }, [heat.data]);

  let body;
  if (pagesReq.loading) {
    body = <Loading label="Connecting to analytics telemetry..." />;
  } else if (pagesReq.error) {
    body = <ErrorBox message={pagesReq.error} onRetry={pagesReq.refetch} />;
  } else if (pages.length === 0) {
    body = (
      <Empty message="No pages recorded yet. Visit the demo store to generate interactions.">
        <Link href="/demo" className={styles.ctaLink}>
          Launch Demo Store
        </Link>
      </Empty>
    );
  } else {
    let mapComponent;
    if (heat.loading || (selected !== null && !heat.data && !heat.error)) {
      mapComponent = <Loading label="Synthesizing click coordinates..." />;
    } else if (heat.error) {
      mapComponent = <ErrorBox message={heat.error} onRetry={heat.refetch} />;
    } else if (!heat.data || heat.data.points.length === 0) {
      mapComponent = (
        <Empty message="No click events recorded for this URL yet.">
          <p className={styles.emptyHint}>
            Navigate to this page in another tab, click elements, and click Refresh.
          </p>
        </Empty>
      );
    } else {
      mapComponent = (
        <HeatmapStage
          points={heat.data.points}
          viewMode={viewMode}
          zoomMode={zoomMode}
          bgMode={bgMode}
          intensity={intensity}
          radius={radius}
        />
      );
    }

    body = (
      <>
        {/* KPI Summary Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Page Clicks</span>
              <strong className={styles.statValue}>{metrics.total}</strong>
            </div>
            <span className={styles.statSub}>
              {selectedPageSummary ? `${selectedPageSummary.views} pageviews recorded` : "Recorded in database"}
            </span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Above Fold Density</span>
              <strong className={styles.statValue}>{metrics.aboveFoldPercent}%</strong>
            </div>
            <span className={styles.statSub}>First 800px vertical depth</span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Hotspot Cluster</span>
              <strong className={styles.statValue}>{metrics.topArea}</strong>
            </div>
            <span className={styles.statSub}>Avg depth: {metrics.avgDepth}px</span>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Scroll Optimization</span>
              <strong className={styles.statValue}>{zoomMode === "fit" ? "Active" : `${zoomMode}%`}</strong>
            </div>
            <span className={styles.statSub}>
              {zoomMode === "fit" ? "Zero page scrolling required" : "Custom zoom level"}
            </span>
          </div>
        </div>

        {/* Workbench Control Toolbar */}
        <div className={styles.toolbar}>
          {/* Page Picker */}
          <div className={styles.toolGroup}>
            <label htmlFor="page-select" className={styles.toolLabel}>
              Tracked URL:
            </label>
            <div className={styles.selectWrap}>
              <select
                id="page-select"
                className={styles.select}
                value={selected ?? ""}
                onChange={(e) => setSelected(e.target.value)}
              >
                {pages.map((p) => (
                  <option key={p.url} value={p.url}>
                    {pathOf(p.url)} — {p.clicks} clicks ({p.views} views)
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <a
                href={selected}
                target="_blank"
                rel="noreferrer"
                className={styles.openLink}
                title="Open live URL"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={heat.refetch}
              disabled={heat.loading}
              title="Refresh telemetry"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={heat.loading ? styles.spinning : ""}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{heat.loading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {/* Visualization Mode Switcher */}
          <div className={styles.toolGroup}>
            <span className={styles.toolLabel}>Overlay:</span>
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segBtn} ${viewMode === "hybrid" ? styles.segActive : ""}`}
                onClick={() => setViewMode("hybrid")}
              >
                Hybrid
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${viewMode === "thermal" ? styles.segActive : ""}`}
                onClick={() => setViewMode("thermal")}
              >
                Thermal
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${viewMode === "points" ? styles.segActive : ""}`}
                onClick={() => setViewMode("points")}
              >
                Pins
              </button>
            </div>
          </div>

          {/* Viewport Fit & Zoom Controls */}
          <div className={styles.toolGroup}>
            <span className={styles.toolLabel}>Screen Fit:</span>
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segBtn} ${zoomMode === "fit" ? styles.segActive : ""}`}
                onClick={() => setZoomMode("fit")}
                title="Fit full page height inside window with zero scrolling"
              >
                Fit Window
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${zoomMode === "100" ? styles.segActive : ""}`}
                onClick={() => setZoomMode("100")}
              >
                100%
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${zoomMode === "75" ? styles.segActive : ""}`}
                onClick={() => setZoomMode("75")}
              >
                75%
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${zoomMode === "50" ? styles.segActive : ""}`}
                onClick={() => setZoomMode("50")}
              >
                50%
              </button>
            </div>
          </div>

          {/* Blueprint Mode */}
          <div className={styles.toolGroup}>
            <span className={styles.toolLabel}>Layout:</span>
            <div className={styles.segmented}>
              <button
                type="button"
                className={`${styles.segBtn} ${bgMode === "wireframe" ? styles.segActive : ""}`}
                onClick={() => setBgMode("wireframe")}
                title="Mock webpage layout outline"
              >
                Wireframe
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${bgMode === "grid" ? styles.segActive : ""}`}
                onClick={() => setBgMode("grid")}
                title="Precision coordinate grid"
              >
                Grid
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${bgMode === "clean" ? styles.segActive : ""}`}
                onClick={() => setBgMode("clean")}
              >
                Clean
              </button>
            </div>
          </div>

          {/* Sliders: Radius & Intensity */}
          <div className={styles.toolSliders}>
            <div className={styles.sliderWrap}>
              <span className={styles.sliderLabel}>Intensity: {Math.round(intensity * 100)}%</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className={styles.rangeInput}
              />
            </div>
            <div className={styles.sliderWrap}>
              <span className={styles.sliderLabel}>Radius: {radius}px</span>
              <input
                type="range"
                min="12"
                max="48"
                step="2"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className={styles.rangeInput}
              />
            </div>
          </div>
        </div>

        {/* The Heatmap Workbench Display */}
        <div className={styles.workbench}>{mapComponent}</div>

        {/* Legend Bar */}
        <div className={styles.legendBar}>
          <div className={styles.legendThermal}>
            <span className={styles.legendTitle}>Thermal Intensity:</span>
            <span className={styles.legendCold}>Low</span>
            <div className={styles.gradientBar} />
            <span className={styles.legendHot}>Hotspot</span>
          </div>

          <div className={styles.legendPins}>
            <div className={styles.legendItem}>
              <span className={styles.pinDotExample} />
              <span>Single Click</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.pinHotExample} />
              <span>Multi-Click Cluster</span>
            </div>
          </div>

          <div className={styles.legendHint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Hover over click pins to inspect exact coordinates & target elements</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Click Heatmap & Interaction Density</h1>
          <p className={styles.subtitle}>
            Real-time visual interaction telemetry with zero-scroll responsive scaling.
          </p>
        </div>
        <div className={styles.headerBadges}>
          <span className={styles.engineBadge}>Adaptive Viewport Active</span>
        </div>
      </div>

      <div className={styles.mainPanel}>{body}</div>
    </div>
  );
}
