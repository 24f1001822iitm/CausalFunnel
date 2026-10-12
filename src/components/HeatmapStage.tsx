"use client";

import { useMemo } from "react";
import type { HeatmapPoint } from "@/lib/types";
import styles from "./HeatmapStage.module.css";

export const MAX_DOTS = 3000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function HeatmapStage({ points }: { points: HeatmapPoint[] }) {
  const valid = useMemo(
    () => points.filter((p) => p.pageWidth > 0 && p.pageHeight > 0 && Number.isFinite(p.x) && Number.isFinite(p.y)),
    [points],
  );
  const shown = valid.length > MAX_DOTS ? valid.slice(0, MAX_DOTS) : valid;

  const ratio = useMemo(() => {
    const w = median(valid.map((p) => p.pageWidth));
    const h = median(valid.map((p) => p.pageHeight));
    return w > 0 && h > 0 ? `${w} / ${h}` : "16 / 10";
  }, [valid]);

  return (
    <div>
      <div
        className={styles.stage}
        style={{ aspectRatio: ratio }}
        role="img"
        aria-label={`Click heatmap with ${valid.length} clicks`}
      >
        {shown.map((p, i) => (
          <span
            key={i}
            className={styles.dot}
            style={{
              left: `${clamp01(p.x / p.pageWidth) * 100}%`,
              top: `${clamp01(p.y / p.pageHeight) * 100}%`,
            }}
          />
        ))}
      </div>
      {valid.length > MAX_DOTS && (
        <p className={styles.note}>Showing the first {MAX_DOTS} of {valid.length} clicks.</p>
      )}
      <div className={styles.legend} aria-label="Legend">
        <span className={styles.swatch} aria-hidden="true" /> One click
        <span className={`${styles.swatch} ${styles.hot}`} aria-hidden="true" /> Overlapping clicks (hotter)
      </div>
    </div>
  );
}
