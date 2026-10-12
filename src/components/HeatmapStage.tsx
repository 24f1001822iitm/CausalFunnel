"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export interface HeatmapStageProps {
  points: HeatmapPoint[];
  viewMode?: "thermal" | "points" | "hybrid";
  zoomMode?: "fit" | "100" | "75" | "50";
  bgMode?: "wireframe" | "grid" | "clean";
  intensity?: number;
  radius?: number;
}

export function HeatmapStage({
  points,
  viewMode = "hybrid",
  zoomMode = "fit",
  bgMode = "wireframe",
  intensity = 0.65,
  radius = 24,
}: HeatmapStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [activeTooltip, setActiveTooltip] = useState<{
    point: HeatmapPoint;
    xPercent: number;
    yPercent: number;
    count: number;
  } | null>(null);

  const valid = useMemo(
    () =>
      points.filter(
        (p) => p.pageWidth > 0 && p.pageHeight > 0 && Number.isFinite(p.x) && Number.isFinite(p.y),
      ),
    [points],
  );

  const shown = useMemo(
    () => (valid.length > MAX_DOTS ? valid.slice(0, MAX_DOTS) : valid),
    [valid],
  );

  const { refWidth, refHeight } = useMemo(() => {
    const w = median(valid.map((p) => p.pageWidth)) || 1440;
    const h = median(valid.map((p) => p.pageHeight)) || 1200;
    return { refWidth: w, refHeight: h };
  }, [valid]);

  const aspectRatio = `${refWidth} / ${refHeight}`;

  // Cluster points for tooltip and click density
  const clusters = useMemo(() => {
    const map = new Map<string, { point: HeatmapPoint; count: number }>();
    for (const p of shown) {
      // Cluster within ~20px grid
      const cx = Math.round(p.x / 20) * 20;
      const cy = Math.round(p.y / 20) * 20;
      const key = `${cx},${cy}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { point: p, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [shown]);

  // Render HTML5 Canvas Thermal Heatmap
  useEffect(() => {
    if (viewMode === "points") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Use internal canvas resolution
    const w = 1000;
    const h = Math.round((1000 / refWidth) * refHeight);
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (shown.length === 0) return;

    // 1. Draw black/white radial density alpha map
    const alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = w;
    alphaCanvas.height = h;
    const alphaCtx = alphaCanvas.getContext("2d");
    if (!alphaCtx) return;

    const rad = Math.max(8, Math.round((radius / refWidth) * w * 1.5));
    const baseAlpha = Math.min(1, Math.max(0.1, intensity * 0.4));

    for (const p of shown) {
      const px = clamp01(p.x / p.pageWidth) * w;
      const py = clamp01(p.y / p.pageHeight) * h;

      const grad = alphaCtx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, `rgba(0, 0, 0, ${baseAlpha})`);
      grad.addColorStop(0.5, `rgba(0, 0, 0, ${baseAlpha * 0.4})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      alphaCtx.fillStyle = grad;
      alphaCtx.beginPath();
      alphaCtx.arc(px, py, rad, 0, Math.PI * 2);
      alphaCtx.fill();
    }

    // 2. Color palette gradient (Cold to Hot: blue -> cyan -> lime -> yellow -> red)
    const paletteCanvas = document.createElement("canvas");
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext("2d");
    if (!pCtx) return;

    const pGrad = pCtx.createLinearGradient(0, 0, 256, 0);
    pGrad.addColorStop(0.0, "rgba(0, 0, 255, 0)");
    pGrad.addColorStop(0.15, "rgba(59, 130, 246, 0.4)"); // Blue
    pGrad.addColorStop(0.35, "rgba(6, 182, 212, 0.7)");  // Cyan
    pGrad.addColorStop(0.55, "rgba(34, 197, 94, 0.85)"); // Lime / Green
    pGrad.addColorStop(0.75, "rgba(245, 158, 11, 0.95)"); // Amber / Yellow
    pGrad.addColorStop(0.92, "rgba(239, 68, 68, 1.0)");  // Red
    pGrad.addColorStop(1.0, "rgba(185, 28, 28, 1.0)");   // Crimson hot

    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 256, 1);
    const paletteData = pCtx.getImageData(0, 0, 256, 1).data;

    // 3. Map alpha image data to color palette
    const imgData = alphaCtx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0) {
        const pIndex = alpha * 4;
        pixels[i] = paletteData[pIndex];         // R
        pixels[i + 1] = paletteData[pIndex + 1]; // G
        pixels[i + 2] = paletteData[pIndex + 2]; // B
        pixels[i + 3] = Math.round(paletteData[pIndex + 3] * intensity); // Dynamic alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [shown, refWidth, refHeight, viewMode, intensity, radius]);

  // Determine stage dimensions & scaling
  const zoomClass =
    zoomMode === "fit"
      ? styles.zoomFit
      : zoomMode === "100"
      ? styles.zoom100
      : zoomMode === "75"
      ? styles.zoom75
      : styles.zoom50;

  return (
    <div className={`${styles.container} ${zoomMode === "fit" ? styles.containerFit : styles.containerScroll}`}>
      {/* Browser Viewport Frame */}
      <div className={styles.browserFrame}>
        {/* Browser Top Chrome */}
        <div className={styles.chrome}>
          <div className={styles.trafficLights}>
            <span className={styles.lightRed} />
            <span className={styles.lightYellow} />
            <span className={styles.lightGreen} />
          </div>
          <div className={styles.addressBar}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className={styles.addressText}>
              {valid[0]?.pageWidth ? `Resolution: ${refWidth} × ${refHeight} px` : "Web Page Viewport"}
            </span>
            <span className={styles.viewBadge}>
              {zoomMode === "fit" ? "Fit to Window" : `Zoom ${zoomMode}%`}
            </span>
          </div>
          <div className={styles.pointsCount}>
            <span className={styles.liveDot} />
            <span>{valid.length} clicks tracked</span>
          </div>
        </div>

        {/* Viewport Area */}
        <div className={styles.viewportArea}>
          <div
            ref={stageRef}
            className={`${styles.stage} ${zoomClass} ${
              bgMode === "wireframe" ? styles.bgWireframe : bgMode === "grid" ? styles.bgGrid : styles.bgClean
            }`}
            style={{ aspectRatio }}
            role="img"
            aria-label={`Click heatmap with ${valid.length} clicks`}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            {/* Optional Smart Wireframe Outline to give layout context */}
            {bgMode === "wireframe" && (
              <div className={styles.wireframeLayout} aria-hidden="true">
                <div className={styles.wfHeader}>
                  <div className={styles.wfBrand} />
                  <div className={styles.wfNav} />
                </div>
                <div className={styles.wfHero}>
                  <div className={styles.wfHeroTitle} />
                  <div className={styles.wfHeroText} />
                  <div className={styles.wfHeroCta} />
                </div>
                <div className={styles.wfCards}>
                  <div className={styles.wfCard} />
                  <div className={styles.wfCard} />
                  <div className={styles.wfCard} />
                </div>
                <div className={styles.wfSection}>
                  <div className={styles.wfSectionTitle} />
                  <div className={styles.wfGrid}>
                    <div className={styles.wfTile} />
                    <div className={styles.wfTile} />
                    <div className={styles.wfTile} />
                    <div className={styles.wfTile} />
                  </div>
                </div>
                <div className={styles.wfFooter} />
              </div>
            )}

            {/* Canvas Thermal Density Glow Layer */}
            {viewMode !== "points" && (
              <canvas
                ref={canvasRef}
                className={styles.thermalCanvas}
                style={{ opacity: intensity }}
              />
            )}

            {/* Precision Click Pins Layer */}
            {viewMode !== "thermal" && (
              <div className={styles.pinsLayer}>
                {clusters.map((c, i) => {
                  const p = c.point;
                  const left = clamp01(p.x / p.pageWidth) * 100;
                  const top = clamp01(p.y / p.pageHeight) * 100;
                  const isHot = c.count > 1;

                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.pin} ${isHot ? styles.pinHot : ""}`}
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                      }}
                      onMouseEnter={() =>
                        setActiveTooltip({
                          point: p,
                          xPercent: left,
                          yPercent: top,
                          count: c.count,
                        })
                      }
                      onClick={() =>
                        setActiveTooltip({
                          point: p,
                          xPercent: left,
                          yPercent: top,
                          count: c.count,
                        })
                      }
                      aria-label={`Click at X: ${Math.round(p.x)}, Y: ${Math.round(p.y)}`}
                    >
                      <span className={styles.pinDot} />
                      {c.count > 1 && <span className={styles.pinBadge}>{c.count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Interactive Tooltip Card */}
            {activeTooltip && (
              <div
                className={styles.tooltipCard}
                style={{
                  left: `${activeTooltip.xPercent}%`,
                  top: `${activeTooltip.yPercent}%`,
                }}
              >
                <div className={styles.tooltipHeader}>
                  <span className={styles.tooltipTitle}>Click Position</span>
                  {activeTooltip.count > 1 && (
                    <span className={styles.tooltipCount}>{activeTooltip.count} clicks</span>
                  )}
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Coordinates:</span>
                  <code className={styles.tooltipValue}>
                    X: {Math.round(activeTooltip.point.x)}px, Y: {Math.round(activeTooltip.point.y)}px
                  </code>
                </div>
                {activeTooltip.point.target && (
                  <div className={styles.tooltipRow}>
                    <span className={styles.tooltipLabel}>Target:</span>
                    <code className={styles.tooltipTarget}>
                      {activeTooltip.point.target}
                    </code>
                  </div>
                )}
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Page Depth:</span>
                  <span className={styles.tooltipValue}>
                    {Math.round(
                      (activeTooltip.point.y / (activeTooltip.point.pageHeight || 1)) * 100,
                    )}
                    % from top
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {valid.length > MAX_DOTS && (
        <p className={styles.note}>
          Displaying optimized sample of {MAX_DOTS} of {valid.length} recorded clicks.
        </p>
      )}
    </div>
  );
}
