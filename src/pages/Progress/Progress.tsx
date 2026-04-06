import { useNavigate } from "react-router-dom";
import { useProgress } from "../../hooks/useQueries";
import MetricCard from "../../components/MetricCard";

function formatDate(value: string | null): string {
  if (!value) return "עדיין אין";
  try {
    return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function Progress() {
  const navigate = useNavigate();
  const { data: progress, isLoading, refetch } = useProgress();

  const pct =
    progress && progress.total_words > 0
      ? Math.round((progress.words_mastered / progress.total_words) * 100)
      : 0;

  if (isLoading || !progress) {
    return (
      <div className="view-grid">
        <div className="empty-state">טוען...</div>
      </div>
    );
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>ההתקדמות שלי</h2>
        <button
          className="btn-secondary"
          onClick={() => void refetch()}
          disabled={isLoading}
        >
          רענון נתונים
        </button>
      </div>

      <div className="score-hero">
        <div className="score-hero__icon">🏆</div>
        <div className="score-hero__value">{progress.total_score}</div>
        <div className="score-hero__label">ניקוד כולל</div>
      </div>

      <div className="stats-row">
        <MetricCard label="מילים במאגר" value={progress.total_words} color="red" />
        <MetricCard label="נלמדו בהצלחה" value={progress.words_mastered} color="green" />
        <MetricCard label="בתהליך למידה" value={progress.words_in_progress} color="orange" />
        <MetricCard label="רצף ימים" value={progress.streak_days} color="red" />
      </div>

      <div className="cards-grid">
        <div className="content-card">
          <h3 style={{ marginBottom: "1rem" }}>שיעור שליטה</h3>
          <div className="mastery-bar-wrap">
            <div className="mastery-bar" style={{ width: `${pct}%` }} />
          </div>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {pct}% מהמילים שלך נלמדו בהצלחה
          </p>
        </div>

        <div
          className="content-card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h3>פגישה אחרונה</h3>
            <p className="subtitle" style={{ marginBottom: 0 }}>
              {formatDate(progress.last_session_date)}
            </p>
          </div>
          <button
            className="btn-primary"
            style={{ width: "auto", padding: "0.75rem 1.5rem", marginTop: 0 }}
            onClick={() => navigate("/training")}
          >
            🎯 התחל תרגול
          </button>
        </div>
      </div>
    </div>
  );
}
