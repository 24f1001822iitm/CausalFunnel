"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const pathname = usePathname();

  const isSessions = pathname.startsWith("/sessions") || pathname === "/";
  const isHeatmap = pathname.startsWith("/heatmap");
  const isDemo = pathname.startsWith("/demo");

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/sessions" className={styles.brand} aria-label="CausalFunnel Home">
            <span className={styles.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4h18l-7 8.5v6.5l-4 2v-8.5L3 4z" fill="url(#brandGrad)" />
                <circle cx="12" cy="12" r="3" fill="#ffffff" opacity="0.9" />
                <defs>
                  <linearGradient id="brandGrad" x1="3" y1="4" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="0.5" stopColor="#818cf8" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className={styles.brandName}>
              Causal<span className={styles.brandAccent}>Funnel</span>
            </span>
            <span className={styles.badge}>ANALYTICS</span>
          </Link>

          <div className={styles.liveIndicator} title="Real-time session recording enabled">
            <span className={styles.livePulse} />
            <span className={styles.liveText}>Live Telemetry</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary Navigation">
          <Link
            href="/sessions"
            className={`${styles.navLink} ${isSessions ? styles.active : ""}`}
            aria-current={isSessions ? "page" : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Sessions</span>
          </Link>

          <Link
            href="/heatmap"
            className={`${styles.navLink} ${isHeatmap ? styles.active : ""}`}
            aria-current={isHeatmap ? "page" : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span>Click Heatmap</span>
            <span className={styles.navChip}>Zero-Scroll</span>
          </Link>

          <Link
            href="/demo"
            className={`${styles.navLink} ${isDemo ? styles.active : ""}`}
            aria-current={isDemo ? "page" : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Demo Store</span>
          </Link>
        </nav>

        <div className={styles.right}>
          <a
            href="/demo"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.testBtn}
            title="Open Demo Store in a new tab to generate live clicks"
          >
            <span>Generate Clicks</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
