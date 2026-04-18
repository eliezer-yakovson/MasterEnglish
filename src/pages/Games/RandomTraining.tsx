import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "../../store";
import { useLibrary, useSubmitTrainingResult } from "../../hooks/useQueries";
import type { LibraryItem } from "../../types";
import SpeakButton from "../../components/SpeakButton";

type Phase = "idle" | "recall" | "revealed" | "done";

interface SummaryEntry {
  word: string;
  translation: string;
  answer: "correct" | "incorrect";
  time_taken_ms: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function RandomTraining() {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const setStatusMessage = useAppStore((s) => s.setStatusMessage);
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<"en-he" | "he-en">("en-he");
  const [phase, setPhase] = useState<Phase>("idle");
  const [shuffledWords, setShuffledWords] = useState<LibraryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [summary, setSummary] = useState<SummaryEntry[]>([]);

  const sessionId = useRef<string>("");
  const wordStartedAt = useRef<number>(0);

  const { data: library, isLoading } = useLibrary("");
  const answerMutation = useSubmitTrainingResult();

  const currentWord = shuffledWords[currentIndex] ?? null;
  const questionText = currentWord
    ? direction === "en-he"
      ? currentWord.word
      : currentWord.translation
    : "";
  const answerText = currentWord
    ? direction === "en-he"
      ? currentWord.translation
      : currentWord.word
    : "";
  const speakWord = currentWord?.word ?? "";

  function handleStart() {
    const words = library?.items ?? [];
    if (words.length === 0) {
      setStatusMessage("אין מילים בספרייה לתרגול.");
      return;
    }
    setShuffledWords(shuffleArray(words));
    setCurrentIndex(0);
    setSummary([]);
    sessionId.current = crypto.randomUUID();
    setPhase("recall");
    wordStartedAt.current = Date.now();
  }

  function handleReveal() {
    setPhase("revealed");
  }

  function handleAnswer(answer: "correct" | "incorrect") {
    if (!currentWord || !session?.user_id) return;
    const timeTaken = Date.now() - wordStartedAt.current;

    answerMutation.mutate(
      {
        session_id: sessionId.current,
        word_id: currentWord.word_id,
        result: answer,
        time_taken_ms: timeTaken,
        score_only: true,
      },
      {
        onSuccess: () => {
          setSummary((prev) => [
            ...prev,
            { word: currentWord.word, translation: currentWord.translation, answer, time_taken_ms: timeTaken },
          ]);

          const nextIndex = currentIndex + 1;
          if (nextIndex >= shuffledWords.length) {
            // Reshuffle for a new round and continue
            setShuffledWords((prev) => shuffleArray(prev));
            setCurrentIndex(0);
          } else {
            setCurrentIndex(nextIndex);
          }
          setPhase("recall");
          wordStartedAt.current = Date.now();
        },
      },
    );
  }

  function handleStop() {
    void queryClient.invalidateQueries({ queryKey: ["progress", session?.user_id ?? ""] });
    setPhase("done");
  }

  function formatMs(ms: number): string {
    return ms < 1000 ? `${ms}מ"ש` : `${(ms / 1000).toFixed(1)}ש'`;
  }

  const correctCount = summary.filter((e) => e.answer === "correct").length;
  const totalMs = summary.reduce((acc, e) => acc + e.time_taken_ms, 0);

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>🎲 תרגול חופשי</h2>
        <button className="btn-secondary" onClick={() => navigate("/games")}>
          ← חזור למשחקים
        </button>
      </div>

      <div className="cards-grid">
        <div className="content-card training-section">
          <h3>תרגול אקראי</h3>
          <p className="subtitle">
            מילים נבחרות אקראית מכל המאגר שלך ללא הגבלה. משפיע רק על הניקוד.
          </p>

          {/* ── IDLE ── */}
          {phase === "idle" && (
            <div className="training-controls">
              <div className="direction-selector">
                <p className="direction-selector-label">כיוון השאלה</p>
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

              <button
                className="btn-primary"
                onClick={handleStart}
                disabled={isLoading || (library?.items.length ?? 0) === 0}
              >
                {isLoading ? "טוען מילים..." : "התחל תרגול חופשי"}
              </button>

              {!isLoading && (library?.items.length ?? 0) === 0 && (
                <p className="subtitle" style={{ color: "var(--danger-color, red)" }}>
                  אין מילים בספרייה — הוסף מילים תחילה.
                </p>
              )}
            </div>
          )}

          {/* ── RECALL ── */}
          {phase === "recall" && currentWord && (
            <div className="active-training">
              <div className="progress-badge">
                {summary.length + 1} שאלות עד כה | {correctCount} נכון
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
              <button
                className="btn-secondary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={handleStop}
              >
                עצור וראה סיכום
              </button>
            </div>
          )}

          {/* ── REVEALED ── */}
          {phase === "revealed" && currentWord && (
            <div className="active-training revealed">
              <div className="progress-badge">
                {summary.length + 1} שאלות עד כה | {correctCount} נכון
              </div>
              <div className="training-word-row">
                <h2 className="training-word">{questionText}</h2>
                <SpeakButton word={speakWord} size="lg" />
              </div>
              <p className="training-desc training-translation-show">{answerText}</p>
              <div className="training-actions">
                <button
                  className="action-btn danger"
                  onClick={() => handleAnswer("incorrect")}
                  disabled={answerMutation.isPending}
                >
                  לא זכרתי 😕
                </button>
                <button
                  className="action-btn success"
                  onClick={() => handleAnswer("correct")}
                  disabled={answerMutation.isPending}
                >
                  ידעתי 🎉
                </button>
              </div>
              <button
                className="btn-secondary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={handleStop}
              >
                עצור וראה סיכום
              </button>
            </div>
          )}

          {/* ── DONE ── */}
          {phase === "done" && (
            <div className="training-done">
              {summary.length > 0 ? (
                <>
                  <div className="done-stats">
                    <div className="done-stat correct">
                      <span className="stat-num">{correctCount}</span>
                      <span className="stat-label">ידעתי</span>
                    </div>
                    <div className="done-stat incorrect">
                      <span className="stat-num">{summary.length - correctCount}</span>
                      <span className="stat-label">לא זכרתי</span>
                    </div>
                    <div className="done-stat time">
                      <span className="stat-num">{formatMs(totalMs)}</span>
                      <span className="stat-label">זמן כולל</span>
                    </div>
                  </div>

                  <div className="summary-list">
                    {summary.map((item, idx) => (
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
                </>
              ) : (
                <p className="subtitle">לא ענית על אף שאלה.</p>
              )}

              <button
                className="btn-primary"
                style={{ marginTop: "1.5rem", width: "100%" }}
                onClick={() => {
                  setPhase("idle");
                  setSummary([]);
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
