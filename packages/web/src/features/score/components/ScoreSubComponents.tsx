import styles from './Score.module.css';

/** Formats a [0, 1] rate as a percentage string, e.g. 0.75 → "75.00 %" */
export function fmtRate(rate: number): string {
  return `${(rate * 100).toFixed(2)} %`;
}

interface GaugeBarProps {
  value: number; // 0–100
  color: string;
}

/** Animated horizontal progress bar. */
export function GaugeBar({ value, color }: GaugeBarProps): JSX.Element {
  return (
    <div className={styles.progressBarBg}>
      <div
        className={styles.progressBarFill}
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
        }}
      />
    </div>
  );
}

interface ComponentRowProps {
  label: string;
  rate: number; // 0–1
  weight: string;
  color: string;
}

/** One row in the score breakdown section. */
export function ComponentRow({ label, rate, weight, color }: ComponentRowProps): JSX.Element {
  return (
    <div className={styles.rowItem}>
      <div className={styles.rowHeader}>
        <span className={styles.rowLabel}>{label}</span>
        <div className={styles.rowValues}>
          <span className={styles.rowRate}>{fmtRate(rate)}</span>
          <span className={styles.rowWeight}>weight {weight}</span>
        </div>
      </div>
      <GaugeBar value={rate * 100} color={color} />
    </div>
  );
}
