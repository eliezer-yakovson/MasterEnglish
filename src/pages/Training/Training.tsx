import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../../store";
import { useStartTraining, useSubmitTrainingResult } from "../../hooks/useQueries";
import type { TrainingSession, TrainingItem, TrainingSummaryEntry } from "../../types";
import SpeakButton from "../../components/SpeakButton";

type Phase = "idle" | "recall" | "revealed" | "done";

export default function Training() {
  const session = useAppStore((s) => s.session);
  const setStatusMessage = useAppStore((s) => s.setStatusMessage);
  const queryClient = useQueryClient();

  const [trainingCount, setTrainingCount] = useState(6);
  const [direction, setDirection] = useState<"en-he" | "he-en">("en-he");
  const [trainingSession, setTrainingSession] = useState<TrainingSession | null>(null);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [trainingSummary, setTrainingSummary] = useState<TrainingSummaryEntry[]>([]);

  const wordStartedAt = useRef<number>(0);

  const startMutation = useStartTraining();
  const answerMutation = useSubmitTrainingResult();

  const currentItem: TrainingItem | null = trainingSession?.queue?.[trainingIndex] ?? null;

  // question = what's shown; answer = what's hidden and then revealed
  const questionText = currentItem ? (direction === "en-he" ? currentItem.word : currentItem.translation) : "";
  const answerText   = currentItem ? (direction === "en-he" ? currentItem.translation : currentItem.word) : "";
  const speakWord    = currentItem?.word ?? "";

  // ── 1. התחלת סשן + טעינת מילים ────────────────────────────────────────
  function handleTrainingStart() {
    startMutation.mutate(trainingCount, {
      onSuccess: (result) => {
        setTrainingSession(result);
        setTrainingIndex(0);
        setTrainingSummary([]);
        if (!result.queue.length) {
          setStatusMessage("אין כרגע מילים שממתינות לתרגול.");
          setPhase("idle");
        } else {
          setStatusMessage(`סבב תרגול נטען עם ${result.queue.length} מילים.`);
          // ── 3. הצגת מילה (ללא תרגום) ─────────────────────────────────
          setPhase("recall");
          wordStartedAt.current = Date.now();  // ── 9. מדידת זמן מתחיל כאן
        }
      },
    });
  }

  // ── 4. החלטת משתמש + 7. הצגת תרגום ────────────────────────────────────
  function handleReveal() {
    setPhase("revealed");
  }

  // ── 5/6. תשובה נכונה / שגויה + 8. מעבר למילה הבאה ─────────────────────
  function handleTrainingAnswer(answer: "correct" | "incorrect") {
    if (!currentItem || !trainingSession || !session?.user_id) return;

    const timeTaken = Date.now() - wordStartedAt.current; // ── 9. מדידת זמן מסתיים

    answerMutation.mutate(
      {
        session_id: trainingSession.session_id,
        word_id: currentItem.word_id,
        result: answer,
        time_taken_ms: timeTaken,
      },
      {
        onSuccess: (response) => {
          setTrainingSummary((prev) => [
            ...prev,
            {
              word: currentItem.word,
              translation: currentItem.translation,
              answer,
              next_review_date: response.next_review_date,
              new_stage: response.new_stage,
              time_taken_ms: timeTaken,
            },
          ]);

          const nextIndex = trainingIndex + 1;

          // ── 10. סיום הסבב ──────────────────────────────────────────────
          if (nextIndex >= trainingSession.queue.length) {
            setTrainingSession(null);
            setTrainingIndex(0);
            setPhase("done");
            void queryClient.invalidateQueries({ queryKey: ["progress", session.user_id] });
            void queryClient.invalidateQueries({ queryKey: ["library", session.user_id] });
            setStatusMessage("סבב התרגול הושלם והנתונים עודכנו.");
            return;
          }

          // ── 8. מעבר למילה הבאה ─────────────────────────────────────────
          setTrainingIndex(nextIndex);
          setPhase("recall");
          wordStartedAt.current = Date.now(); // ── 9. מדידת זמן – מילה חדשה
        },
      },
    );
  }

  function formatMs(ms: number): string {
    return ms < 1000 ? `${ms}מ"ש` : `${(ms / 1000).toFixed(1)}ש'`;
  }

  const correctCount = trainingSummary.filter((e) => e.answer === "correct").length;
  const totalMs = trainingSummary.reduce((acc, e) => acc + e.time_taken_ms, 0);

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>אזור תרגול</h2>
      </div>

      <div className="cards-grid">
        <div className="content-card training-section">
          <h3>סבב חזרה</h3>
          <p className="subtitle">חזרה על מילים מחזקת את הזיכרון לטווח ארוך.</p>

          {/* ── IDLE – הגדרות + כפתור התחל ── */}
          {phase === "idle" && (
            <div className="training-controls">

              {/* כיוון תרגול */}
              <div className="direction-selector">
                <p className="direction-selector-label">כיוון השאלה — מה יוצג ומה תצטרך לזכור?</p>
                <div className="direction-options">
                  <button
                    type="button"
                    className={`direction-btn${direction === "en-he" ? " active" : ""}`}
                    onClick={() => setDirection("en-he")}
                  >
                    <span className="dir-langs">English → עברית</span>
                    <span className="dir-hint">רואים אנגלית, זוכרים עברית</span>
                  </button>
                  <button
                    type="button"
                    className={`direction-btn${direction === "he-en" ? " active" : ""}`}
                    onClick={() => setDirection("he-en")}
                  >
                    <span className="dir-langs">עברית → English</span>
                    <span className="dir-hint">רואים עברית, זוכרים אנגלית</span>
                  </button>
                </div>
              </div>

              {/* כמות מילים */}
              <label className="training-count-label">
                <span>מספר מילים לאימון:</span>
                <select
                  value={trainingCount}
                  onChange={(e) => setTrainingCount(Number(e.target.value))}
                >
                  <option value={4}>4 מילים</option>
                  <option value={6}>6 מילים</option>
                  <option value={10}>10 מילים</option>
                  <option value={15}>15 מילים</option>
                  <option value={20}>20 מילים</option>
                </select>
              </label>

              <button
                className="btn-primary"
                onClick={handleTrainingStart}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending ? "מכין סשן..." : "התחל אימון עכשיו"}
              </button>
            </div>
          )}

          {/* ── LOADING – טעינת מילים ── */}
          {startMutation.isPending && (
            <div className="training-loading">
              <div className="training-spinner" />
              <p>טוען מילים לתרגול...</p>
            </div>
          )}

          {/* ── RECALL – הצגת שאלה בלבד, תשובה מוסתרת ── */}
          {phase === "recall" && currentItem && (
            <div className="active-training">
              <div className="progress-badge">
                מילה {trainingIndex + 1} מתוך {trainingSession!.queue.length}
              </div>
              <div className="training-word-row">
                <h2 className="training-word">{questionText}</h2>
                {direction === "en-he" && <SpeakButton word={speakWord} size="lg" />}
              </div>
              <div className="training-translation-hidden">
                <span>{direction === "en-he" ? "נסה לזכור את התרגום העברי..." : "נסה לזכור את המילה באנגלית..."}</span>
              </div>
              <button className="btn-reveal" onClick={handleReveal}>
                {direction === "en-he" ? "הצג תרגום" : "הצג מילה באנגלית"}
              </button>
            </div>
          )}

          {/* ── REVEALED – שאלה + תשובה + כפתורי תשובה ── */}
          {phase === "revealed" && currentItem && (
            <div className="active-training revealed">
              <div className="progress-badge">
                מילה {trainingIndex + 1} מתוך {trainingSession!.queue.length}
              </div>
              <div className="training-word-row">
                <h2 className="training-word">{questionText}</h2>
                <SpeakButton word={speakWord} size="lg" />
              </div>
              <p className="training-desc training-translation-show">
                {answerText}
              </p>
              <div className="training-actions">
                <button
                  className="action-btn danger"
                  onClick={() => handleTrainingAnswer("incorrect")}
                  disabled={answerMutation.isPending}
                >
                  לא זכרתי 😕
                </button>
                <button
                  className="action-btn success"
                  onClick={() => handleTrainingAnswer("correct")}
                  disabled={answerMutation.isPending}
                >
                  ידעתי 🎉
                </button>
              </div>
            </div>
          )}

          {/* ── DONE – סיום הסבב + סיכום ── */}
          {phase === "done" && trainingSummary.length > 0 && (
            <div className="training-done">
              <div className="done-stats">
                <div className="done-stat correct">
                  <span className="stat-num">{correctCount}</span>
                  <span className="stat-label">ידעתי</span>
                </div>
                <div className="done-stat incorrect">
                  <span className="stat-num">{trainingSummary.length - correctCount}</span>
                  <span className="stat-label">לא זכרתי</span>
                </div>
                <div className="done-stat time">
                  <span className="stat-num">{formatMs(totalMs)}</span>
                  <span className="stat-label">זמן כולל</span>
                </div>
              </div>

              <div className="summary-list">
                {trainingSummary.map((item, idx) => (
                  <div className={`summary-item ${item.answer}`} key={idx}>
                    <span className={`status-icon ${item.answer}`}>
                      {item.answer === "correct" ? "✓" : "✗"}
                    </span>
                    <span className="summary-word">{item.word}</span>
                    <span className="summary-translation">{item.translation}</span>
                    <span className="summary-time">{formatMs(item.time_taken_ms)}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn-primary"
                style={{ marginTop: "1.5rem", width: "100%" }}
                onClick={() => {
                  setPhase("idle");
                  setTrainingSummary([]);
                }}
              >
                סבב חדש
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
