import { useScore } from '../scoreContext';
import { ComponentRow } from './ScoreSubComponents';
import styles from './Score.module.css';

/**
 * ScorePanel renders the productivity score dashboard.
 * Must be used inside a {@link ScoreProvider}.
 */
export function ScorePanel(): JSX.Element {
  const { score, loading, error, refreshScore } = useScore();

  if (loading) {
    return <div className={styles.statusContainer}>Loading score…</div>;
  }

  if (error) {
    return (
      <div className={styles.statusContainer}>
        <p className={styles.errorText}>Failed to load score: {error}</p>
        <button
          className={styles.retryBtn}
          onClick={(): void => { void refreshScore(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!score) return <></>;

  const { score: totalScore, breakdown, calculatedAt } = score;

  const scoreColor =
    totalScore >= 70 ? '#34d399' : totalScore >= 40 ? '#fbbf24' : '#f87171';

  const badgeClass =
    totalScore >= 70
      ? styles.badgeHigh
      : totalScore >= 40
      ? styles.badgeMed
      : styles.badgeLow;

  const badgeText =
    totalScore >= 85
      ? 'Outstanding'
      : totalScore >= 70
      ? 'Great'
      : totalScore >= 40
      ? 'Steady'
      : 'Needs Focus';

  return (
    <div className={styles.container}>
      {/* ── Composite score display ── */}
      <div className={styles.heroCard}>
        <div className={styles.heroGlow} />
        <div className={styles.scoreValue} style={{ color: scoreColor }}>
          {totalScore.toFixed(2)}
        </div>
        <div className={styles.scoreMeta}>
          <span className={styles.scoreTitle}>Productivity Score</span>
          <span className={`${styles.scoreBadge} ${badgeClass}`}>
            {badgeText}
          </span>
        </div>
        <div className={styles.scoreSubtitle}>out of 100</div>
      </div>

      {/* ── Breakdown card ── */}
      <div className={styles.breakdownCard}>
        <h2 className={styles.breakdownTitle}>Score Breakdown</h2>
        <ComponentRow
          label="📝 Task Completion"
          rate={breakdown.taskCompletionRate}
          weight="40 %"
          color="#818cf8"
        />
        <ComponentRow
          label="⏰ Reminder Acknowledgement"
          rate={breakdown.reminderAcknowledgementRate}
          weight="30 %"
          color="#c084fc"
        />
        <ComponentRow
          label="🔥 Habit Streak Consistency"
          rate={breakdown.habitStreakConsistency}
          weight="30 %"
          color="#34d399"
        />
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <span className={styles.timestamp}>
          Calculated at {new Date(calculatedAt).toLocaleTimeString()}
        </span>
        <button
          className={styles.refreshBtn}
          onClick={(): void => { void refreshScore(); }}
        >
          ↻ Refresh Score
        </button>
      </div>
    </div>
  );
}
