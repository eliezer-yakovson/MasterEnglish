import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLibrary, useSubmitTrainingResult } from "../../hooks/useQueries";
import { useAppStore } from "../../store";
import type { LibraryItem } from "../../types";

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 12;
const ROWS = 9;
const WORDS_ON_BOARD = 3;

type Speed = "slow" | "normal" | "fast";
const TICK_MAP: Record<Speed, number> = { slow: 220, normal: 140, fast: 75 };
const SPEED_LABELS: Record<Speed, string> = {
  slow: "🐢 איטי",
  normal: "🏃 רגיל",
  fast: "⚡ מהיר",
};

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Pos = { x: number; y: number };
type Phase = "idle" | "playing" | "dead";

interface WordCell {
  pos: Pos;
  wide: boolean; // spans pos.x and pos.x+1 when true
  item: LibraryItem;
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const THEME = {
  light: {
    bg: "#ffffff",
    grid: "rgba(0,0,0,0.04)",
    targetBg: "#ecfdf5", targetBorder: "#22c55e", targetText: "#065f46",
    wrongBg: "#fef2f2",  wrongBorder: "#f87171",  wrongText: "#991b1b",
    neutralBg: "#f1f5f9", neutralBorder: "#cbd5e1", neutralText: "#334155",
    snakeHead: "#3b82f6", snakeBody: "#93c5fd", snakeEye: "#ffffff",
  },
  dark: {
    bg: "#0f172a",
    grid: "rgba(255,255,255,0.05)",
    targetBg: "#052e16", targetBorder: "#4ade80", targetText: "#a7f3d0",
    wrongBg: "#2d0a0a",  wrongBorder: "#f87171",  wrongText: "#fca5a5",
    neutralBg: "#1e293b", neutralBorder: "#334155", neutralText: "#94a3b8",
    snakeHead: "#60a5fa", snakeBody: "#1d4ed8", snakeEye: "#0f172a",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function randPos(occupied: Pos[], maxX: number, rows: number): Pos {
  let pos: Pos;
  let attempts = 0;
  do {
    pos = { x: Math.floor(Math.random() * maxX), y: Math.floor(Math.random() * rows) };
    attempts++;
  } while (attempts < 200 && occupied.some((o) => o.x === pos.x && o.y === pos.y));
  return pos;
}

function posEq(a: Pos, b: Pos) {
  return a.x === b.x && a.y === b.y;
}

function pickWords(items: LibraryItem[], count: number): LibraryItem[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function placeWords(words: LibraryItem[], snake: Pos[]): WordCell[] {
  const occupied = [...snake];
  return words.map((item) => {
    const isWide = item.word.length > 6;
    const maxX = isWide ? COLS - 1 : COLS;
    let pos: Pos;
    let attempts = 0;
    do {
      pos = randPos(occupied, maxX, ROWS);
      attempts++;
    } while (
      attempts < 200 &&
      (isWide && occupied.some((o) => o.x === pos.x + 1 && o.y === pos.y))
    );
    occupied.push(pos);
    if (isWide) occupied.push({ x: pos.x + 1, y: pos.y });
    return { pos, wide: isWide, item };
  });
}

function hitsWordCell(p: Pos, wc: WordCell): boolean {
  if (wc.wide) return p.y === wc.pos.y && (p.x === wc.pos.x || p.x === wc.pos.x + 1);
  return posEq(p, wc.pos);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SnakeGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const session = useAppStore((s) => s.session);

  const { data: library } = useLibrary("");
  const items = library?.items ?? [];
  const submitResultMutation = useSubmitTrainingResult();

  // ── game state refs ──
  const snakeRef = useRef<Pos[]>([{ x: 6, y: 4 }]);
  const dirRef = useRef<Dir>("RIGHT");
  const nextDirRef = useRef<Dir>("RIGHT");
  const wordCellsRef = useRef<WordCell[]>([]);
  const targetRef = useRef<LibraryItem | null>(null);
  const scoreRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const roundStartRef = useRef<number>(0);
  const cellRef = useRef(48);
  const highlightRef = useRef(true);
  const speedRef = useRef<Speed>("normal");
  const darkRef = useRef(false);
  const nextRoundRef = useRef<(snake: Pos[]) => void>(() => {});
  const endGameRef = useRef<() => void>(() => {});

  // ── React state ──
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [targetWord, setTargetWord] = useState<LibraryItem | null>(null);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [highlight, setHighlight] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("snake_dark") === "1"; } catch { return false; }
  });
  const [highScore, setHighScore] = useState(() => {
    try { return Number(localStorage.getItem("snake_hs") ?? 0); } catch { return 0; }
  });

  // ── draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const C = cellRef.current;
    const showHL = highlightRef.current;
    const W = COLS * C;
    const H = ROWS * C;
    const th = darkRef.current ? THEME.dark : THEME.light;

    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * C, 0); ctx.lineTo(x * C, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * C); ctx.lineTo(W, y * C); ctx.stroke();
    }

    // ── word cells ──
    wordCellsRef.current.forEach((wc) => {
      const { pos, item, wide } = wc;
      const isTarget = targetRef.current?.word_id === item.word_id;
      const px = pos.x * C;
      const py = pos.y * C;
      const cellW = wide ? 2 * C : C;
      const pad = Math.max(4, C * 0.1);
      const radius = Math.max(8, C * 0.18);
      const rX = px + pad;
      const rY = py + pad;
      const rW = cellW - pad * 2;
      const rH = C - pad * 2;

      let bgColor: string, borderColor: string, textColor: string;
      if (showHL) {
        if (isTarget) { bgColor = th.targetBg; borderColor = th.targetBorder; textColor = th.targetText; }
        else          { bgColor = th.wrongBg;  borderColor = th.wrongBorder;  textColor = th.wrongText;  }
      } else {
        bgColor = th.neutralBg; borderColor = th.neutralBorder; textColor = th.neutralText;
      }

      ctx.fillStyle = bgColor;
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.roundRect(rX, rY, rW, rH, radius);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ★ target indicator
      if (isTarget && showHL) {
        ctx.fillStyle = borderColor;
        const starSize = Math.max(10, C * 0.28);
        ctx.font = `bold ${starSize}px sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("★", rX + 5, rY + 3);
      }

      // word text — dynamic font to fit width
      const availW = rW - (isTarget && showHL ? C * 0.4 : 0) - 8;
      const worstCase = item.word.length * 0.6;
      const fontSize = Math.min(
        Math.max(12, C * 0.36),
        Math.max(12, (availW * 0.9) / Math.max(worstCase, 1))
      );
      ctx.fillStyle = textColor;
      ctx.font = `700 ${fontSize}px 'Sora', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.word, px + cellW / 2, py + C / 2);
    });

    // ── snake ──
    snakeRef.current.forEach((seg, i) => {
      const px = seg.x * C;
      const py = seg.y * C;
      const isHead = i === 0;
      ctx.fillStyle = isHead ? th.snakeHead : th.snakeBody;
      const r = isHead ? C * 0.3 : C * 0.22;
      if (isHead) { ctx.shadowColor = th.snakeHead + "55"; ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.roundRect(px + 3, py + 3, C - 6, C - 6, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (isHead) {
        ctx.fillStyle = th.snakeEye;
        const ey = py + C * 0.32;
        ctx.beginPath(); ctx.arc(px + C * 0.3, ey, C * 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + C * 0.7, ey, C * 0.11, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, []);

  // ── resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    function applySize(width: number) {
      const cellByW = Math.floor(width / COLS);
      const cellByH = Math.floor(Math.max(window.innerHeight - 420, 160) / ROWS);
      const cell = Math.max(Math.min(cellByW, cellByH), 16);
      cellRef.current = cell;
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = COLS * cell; canvas.height = ROWS * cell; }
      draw();
    }
    const ro = new ResizeObserver((entries) => applySize(entries[0].contentRect.width));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { highlightRef.current = highlight; draw(); }, [highlight, draw]);

  useEffect(() => {
    darkRef.current = darkMode;
    try { localStorage.setItem("snake_dark", darkMode ? "1" : "0"); } catch {}
    draw();
  }, [darkMode, draw]);

  // ── tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const snake = snakeRef.current;
    const dir = nextDirRef.current;
    dirRef.current = dir;
    const head = snake[0];
    const next: Pos = {
      x: (head.x + (dir === "RIGHT" ? 1 : dir === "LEFT" ? -1 : 0) + COLS) % COLS,
      y: (head.y + (dir === "DOWN" ? 1 : dir === "UP" ? -1 : 0) + ROWS) % ROWS,
    };
    if (snake.some((s) => posEq(s, next))) { endGameRef.current(); return; }
    const hitIdx = wordCellsRef.current.findIndex((wc) => hitsWordCell(next, wc));
    if (hitIdx !== -1) {
      const hit = wordCellsRef.current[hitIdx];
      if (hit.item.word_id === targetRef.current?.word_id) {
        const timeTaken = Date.now() - roundStartRef.current;
        if (sessionIdRef.current && session?.user_id) {
          submitResultMutation.mutate({
            session_id: sessionIdRef.current,
            word_id: hit.item.word_id,
            result: "correct",
            time_taken_ms: timeTaken,
            score_only: true,
          });
        }
        scoreRef.current += 10 + snake.length;
        setScore(scoreRef.current);
        snakeRef.current = [next, ...snake];
        nextRoundRef.current(snakeRef.current);
      } else {
        endGameRef.current(); return;
      }
    } else {
      snakeRef.current = [next, ...snake.slice(0, -1)];
    }
    draw();
  }, [draw]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextRound = useCallback(
    (currentSnake: Pos[]) => {
      if (items.length < WORDS_ON_BOARD) return;
      const chosen = pickWords(items, WORDS_ON_BOARD);
      const target = chosen[Math.floor(Math.random() * chosen.length)];
      targetRef.current = target;
      setTargetWord(target);
      wordCellsRef.current = placeWords(chosen, currentSnake);
      roundStartRef.current = Date.now();
      draw();
    },
    [items, draw],
  );

  useEffect(() => { nextRoundRef.current = nextRound; }, [nextRound]);

  const endGame = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("dead");
    const s = scoreRef.current;
    setScore(s);
    setHighScore((prev) => {
      const next = Math.max(prev, s);
      try { localStorage.setItem("snake_hs", String(next)); } catch {}
      return next;
    });
    if (session?.user_id) {
      void queryClient.invalidateQueries({ queryKey: ["progress", session.user_id] });
      void queryClient.invalidateQueries({ queryKey: ["library", session.user_id] });
    }
  }, [session, queryClient]);

  useEffect(() => { endGameRef.current = endGame; }, [endGame]);

  const startGameLoop = useCallback((sid: string) => {
    const startPos: Pos = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
    sessionIdRef.current = sid;
    snakeRef.current = [startPos];
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    scoreRef.current = 0;
    setScore(0);
    setPhase("playing");
    nextRound([startPos]);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MAP[speedRef.current]);
  }, [nextRound, tick]);

  const startGame = useCallback(() => {
    if (items.length < WORDS_ON_BOARD) return;
    startGameLoop(`game_snake_${Date.now()}`);
  }, [items, startGameLoop]);

  function handleSpeedChange(s: Speed) {
    setSpeed(s);
    speedRef.current = s;
    if (phase === "playing" && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = setInterval(tick, TICK_MAP[s]);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) return;
      const opp: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (newDir !== opp[dirRef.current]) nextDirRef.current = newDir;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  function handleDpad(dir: Dir) {
    const opp: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (dir !== opp[dirRef.current]) nextDirRef.current = dir;
  }

  const notEnoughWords = items.length < WORDS_ON_BOARD;

  return (
    <div className={`snake-page${darkMode ? " snake-dark" : ""}`}>

      {/* ── Top bar ── */}
      <div className="snake-topbar">
        <button className="snake-back-btn" onClick={() => navigate("/games")}>← משחקים</button>
        <div className="snake-topbar-center">
          {targetWord ? (
            <>
              <span className="sn-label">מצא את:</span>
              <span className="sn-target">{targetWord.translation}</span>
            </>
          ) : (
            <span className="sn-label">Snake Words 🐍</span>
          )}
        </div>
        <div className="snake-scores">
          <span className="score-badge">ניקוד: {score}</span>
          <span className="score-badge hs">שיא: {highScore}</span>
        </div>
      </div>

      {/* ── Options bar ── */}
      <div className="snake-optbar">
        <div className="snake-opt-group">
          <span className="snake-opt-label">מהירות:</span>
          {(["slow", "normal", "fast"] as Speed[]).map((s) => (
            <button key={s} className={`snake-opt-btn${speed === s ? " active" : ""}`} onClick={() => handleSpeedChange(s)}>
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="snake-opt-group">
          <span className="snake-opt-label">הדגשה:</span>
          <button className={`snake-opt-btn${highlight ? " active" : ""}`} onClick={() => setHighlight(true)}>✅ כן</button>
          <button className={`snake-opt-btn${!highlight ? " active" : ""}`} onClick={() => setHighlight(false)}>🎲 לא</button>
        </div>
        <div className="snake-opt-group">
          <span className="snake-opt-label">מצב:</span>
          <button className={`snake-opt-btn${!darkMode ? " active" : ""}`} onClick={() => setDarkMode(false)}>☀️ בהיר</button>
          <button className={`snake-opt-btn${darkMode ? " active" : ""}`} onClick={() => setDarkMode(true)}>🌙 כהה</button>
        </div>
      </div>

      {/* ── Canvas board ── */}
      <div className="snake-board" ref={wrapRef}>
        <canvas ref={canvasRef} className="snake-canvas" tabIndex={0} />

        {phase === "idle" && (
          <div className="snake-overlay">
            <div className="snake-intro">
              <div className="snake-intro-icon">🐍</div>
              <h2 className="snake-intro-title">Snake Words</h2>
              <p className="snake-intro-sub">שחק, תרגל ושפר את אוצר המילים שלך</p>
              <div className="snake-how-to">
                <div className="how-step">
                  <span className="how-icon">🎯</span>
                  <span>פירוש בעברית יופיע למעלה — מצא את המילה האנגלית על הלוח</span>
                </div>
                <div className="how-step">
                  <span className="how-icon">🐍</span>
                  <span>הנחש גדל כשאתה אוכל את המילה הנכונה (+ניקוד)</span>
                </div>
                <div className="how-step">
                  <span className="how-icon">💀</span>
                  <span>מילה שגויה או פגיעה בזנב = Game Over</span>
                </div>
              </div>
              {notEnoughWords ? (
                <p className="warn-hint">הוסף לפחות {WORDS_ON_BOARD} מילים לספרייה כדי לשחק.</p>
              ) : (
                <button className="btn-primary large-action" onClick={startGame}>🎮 התחל משחק</button>
              )}
            </div>
          </div>
        )}

        {phase === "dead" && (
          <div className="snake-overlay dead">
            <h3>💀 Game Over</h3>
            <p className="score-final">ניקוד: {score}</p>
            {score >= highScore && score > 0 && <p className="new-hs">🏆 שיא חדש!</p>}
            <button className="btn-primary large-action" onClick={startGame}>שחק שוב</button>
            <button className="btn-secondary" style={{ marginTop: "0.5rem" }} onClick={() => navigate("/games")}>חזור לתפריט</button>
          </div>
        )}
      </div>

      {/* ── D-pad ── */}
      <div className="snake-dpad">
        <div />
        <button className="dpad-btn" onClick={() => handleDpad("UP")}>↑</button>
        <div />
        <button className="dpad-btn" onClick={() => handleDpad("LEFT")}>←</button>
        <div className="dpad-center" />
        <button className="dpad-btn" onClick={() => handleDpad("RIGHT")}>→</button>
        <div />
        <button className="dpad-btn" onClick={() => handleDpad("DOWN")}>↓</button>
        <div />
      </div>

      <p className="keyboard-hint">מקשי חיצים / WASD</p>
    </div>
  );
}
