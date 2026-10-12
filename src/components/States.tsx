import type { ReactNode } from "react";
import styles from "./States.module.css";

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className={styles.box} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}

export function Empty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className={styles.box}>
      <p>{message}</p>
      {children}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`${styles.box} ${styles.error}`} role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
