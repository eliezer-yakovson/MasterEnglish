import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLibrary, useSubmitTrainingResult } from "../../hooks/useQueries";
import { useAppStore } from "../../store";
import type { LibraryItem } from "../../types";

// ── Constants ────────────────────────────────────────────────────────────────
const WORDS_PER_ROUND = 5;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Card {
  id: string;
  text: string;
  type: "word" | "translation";
  wordId: string;
}

type Phase = "idle" | "loading" | "playing" | "roundSummary" | "done";

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildCards(words: LibraryItem[]): Card[] {
  const all: Card[] = [];
  words.forEach((w) => {
    all.push({ id: `w_${w.word_id}`, text: w.word, type: "word", wordId: w.word_id });
    all.push({ id: `t_${w.word_id}`, text: w.translation, type: "translation", wordId: w.word_id });
  });
  return all.sort(() => Math.random() - 0.5);
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return m > 0
    ? `${m}:${String(s % 60).padStart(2, "0")}`
    : `${s}.${tenths}ש'`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SpeedMatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAppStore((s) => s.session);

  const { data: library } = useLibrary("");
  const allItems = library?.items ?? [];

  const submitMutation = useSubmitTrainingResult();

  // stable refs — don't cause re-renders
  const poolRef = useRef<LibraryItem[]>([]);
  const sessionIdRef = useRef<string>("");
  const poolIndexRef = useRef(0);
  const roundStartRef = useRef(0);
  const wrongLockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ui state
  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set()); // word_ids
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [roundSummary, setRoundSummary] = useState<{ time: number; score: number } | null>(null);
  const [noMoreWords, setNoMoreWords] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    try { return Number(localStorage.getItem("sm_hs") ?? 0); } catch { return 0; }
  });

  // ── timer helpers ─────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── startRound ────────────────────────────────────────────────────────────
  const startRound = useCallback(() => {
    const pool = poolRef.current;
    let idx = poolIndexRef.current;

    // exhausted the pool — re-shuffle so we can always keep playing
    if (idx >= pool.length) {
      poolRef.current = [...pool].sort(() => Math.random() - 0.5);
      poolIndexRef.current = 0;
      idx = 0;
    }

    const slice = pool.slice(idx, idx + WORDS_PER_ROUND);
    poolIndexRef.current = idx + slice.length;

    const newCards = buildCards(slice);
    setCards(newCards);
    setMatched(new Set());
    setSelected(null);
    setWrong(null);
    setRoundScore(0);
    wrongLockedRef.current = false;

    const now = Date.now();
    roundStartRef.current = now;
    setElapsed(0);
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - roundStartRef.current);
    }, 100);

    setPhase("playing");
  }, [stopTimer]);

  // ── startGame ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (allItems.length < 2) {
      setNoMoreWords(true);
      return;
    }
    sessionIdRef.current = `game_sm_${Date.now()}`;
    // shuffle all library words; rounds will slice through them
    poolRef.current = [...allItems].sort(() => Math.random() - 0.5);
    poolIndexRef.current = 0;
    setTotalScore(0);
    setRoundsPlayed(0);
    setNoMoreWords(false);
    startRound();
  }, [allItems, startRound]);

  // ── handleCardClick ───────────────────────────────────────────────────────
  const handleCardClick = useCallback((card: Card) => {
    if (wrongLockedRef.current) return;
    if (matched.has(card.wordId)) return;

    // deselect same card
    if (selected === card.id) {
      setSelected(null);
      return;
    }

    // first card selected
    if (!selected) {
      setSelected(card.id);
      return;
    }

    const firstCard = cards.find((c) => c.id === selected);
    if (!firstCard) { setSelected(card.id); return; }

    // same type — swap selection
    if (firstCard.type === card.type) {
      setSelected(card.id);
      return;
    }

    if (firstCard.wordId === card.wordId) {
      // ── CORRECT MATCH ─────────────────────────────────────────────────────
      const timeTaken = Date.now() - roundStartRef.current;
      // score: 100 points max, -5 per second elapsed, min 10
      const pts = Math.max(10, 100 - Math.floor(timeTaken / 1000) * 5);

      submitMutation.mutate({
        session_id: sessionIdRef.current,
        word_id: card.wordId,
        result: "correct",
        time_taken_ms: timeTaken,
        score_only: true,
      });

      const newRoundScore = roundScore + pts;
      const newMatched = new Set([...matched, card.wordId]);
      setRoundScore(newRoundScore);
      setMatched(newMatched);
      setSelected(null);

      // check round completion
      const totalPairs = cards.length / 2;
      if (newMatched.size === totalPairs) {
        stopTimer();
        const finalTime = Date.now() - roundStartRef.current;
        setElapsed(finalTime);

        const newTotal = totalScore + newRoundScore;
        setTotalScore(newTotal);
        setRoundsPlayed((r) => r + 1);
        setRoundSummary({ time: finalTime, score: newRoundScore });

        setHighScore((hs) => {
          const next = Math.max(hs, newTotal);
          try { localStorage.setItem("sm_hs", String(next)); } catch {}
          return next;
        });

        // update library + progress in background
        if (session?.user_id) {
          void queryClient.invalidateQueries({ queryKey: ["progress", session.user_id] });
          void queryClient.invalidateQueries({ queryKey: ["library", session.user_id] });
        }

        setPhase("roundSummary");
      }
    } else {
      // ── WRONG PAIR ────────────────────────────────────────────────────────
      wrongLockedRef.current = true;
      setWrong([selected, card.id]);
      setSelected(null);
      setTimeout(() => {
        setWrong(null);
        wrongLockedRef.current = false;
      }, 700);
    }
  }, [selected, matched, cards, roundScore, totalScore, submitMutation, session, queryClient, stopTimer]);

  // ── cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const hasMoreRounds = poolIndexRef.current < poolRef.current.length;

  return (
    <div className="view-grid">
      {/* Header */}
      <div className="view-header">
        <button className="btn-secondary" onClick={() => { stopTimer(); navigate("/games"); }}>
          ← משחקים
        </button>
        <h2>⚡ Speed Match</h2>
        <div className="snake-scores">
          <span className="score-badge">ניקוד: {totalScore}</span>
          <span className="score-badge hs">שיא: {highScore}</span>
        </div>
      </div>

      {/* ── Idle / Loading ─────────────────────────────────────────────────── */}
      {(phase === "idle" || phase === "loading") && (
        <div className="content-card sm-start-card">
          <div className="sm-start-icon">⚡</div>
          <h3>Speed Match</h3>
          <p className="subtitle">
            חבר כל מילה אנגלית לתרגום העברי שלה כמה שיותר מהר!
            <br />
            <small>כל התאמה נכונה מעלה את ניקוד המילה במאגר</small>
          </p>
          {noMoreWords && (
            <p className="sm-warn">⚠️ אין מספיק מילים בספרייה. הוסף לפחות 2 מילים כדי לשחק.</p>
          )}
          <button
            className="btn-primary large-action"
            onClick={startGame}
            disabled={allItems.length < 2}
            style={{ maxWidth: 280, margin: "0 auto" }}
          >
            {allItems.length < 2 ? "טוען..." : "התחל משחק"}
          </button>
        </div>
      )}

      {/* ── Playing / RoundSummary ─────────────────────────────────────────── */}
      {(phase === "playing" || phase === "roundSummary") && (
        <>
          {/* HUD */}
          <div className="sm-hud">
            <div className="sm-hud-box">
              <span className="sm-hud-label">זמן</span>
              <span className="sm-hud-value">{formatTime(elapsed)}</span>
            </div>
            <div className="sm-hud-center">
              <span className="sm-pairs">{matched.size} / {cards.length / 2}</span>
              <span className="sm-pairs-label">זוגות</span>
            </div>
            <div className="sm-hud-box">
              <span className="sm-hud-label">סיבוב</span>
              <span className="sm-hud-value">+{roundScore}</span>
            </div>
          </div>

          {/* Card Grid with overlay */}
          <div className="sm-grid-wrapper">
            <div className="sm-grid">
              {cards.map((card) => {
                const isMatched = matched.has(card.wordId);
                const isSelected = selected === card.id;
                const isWrong = wrong?.includes(card.id) ?? false;
                return (
                  <button
                    key={card.id}
                    className={[
                      "sm-card",
                      `sm-card--${card.type}`,
                      isMatched ? "sm-matched" : "",
                      isSelected ? "sm-selected" : "",
                      isWrong ? "sm-wrong" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => phase === "playing" && handleCardClick(card)}
                    disabled={isMatched || phase !== "playing"}
                  >
                    {card.text}
                  </button>
                );
              })}
            </div>

            {/* Round summary overlay */}
            {phase === "roundSummary" && roundSummary && (
              <div className="sm-overlay">
                <div className="sm-overlay-inner">
                  <h3>✅ סיבוב הושלם!</h3>
                  <div className="sm-summary-stats">
                    <div className="sm-stat">
                      <span className="sm-stat-icon">⏱</span>
                      <span>{formatTime(roundSummary.time)}</span>
                    </div>
                    <div className="sm-stat">
                      <span className="sm-stat-icon">⭐</span>
                      <span>+{roundSummary.score} נקודות</span>
                    </div>
                    <div className="sm-stat">
                      <span className="sm-stat-icon">📊</span>
                      <span>סה"כ: {totalScore}</span>
                    </div>
                  </div>

                  {/* always show next round button — pool re-shuffles automatically */}
                  <button className="btn-primary" onClick={startRound}>
                    סיבוב הבא ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
