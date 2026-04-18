import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { useIngestWord, useTranslateWord } from "../hooks/useQueries";

interface Props {
  onClose: () => void;
}

export default function AddWordModal({ onClose }: Props) {
  const navigate = useNavigate();
  const setErrorMessage = useAppStore((s) => s.setErrorMessage);

  const [heWord, setHeWord] = useState("");
  const [enWord, setEnWord] = useState("");
  const [lastEdited, setLastEdited] = useState<"he" | "en" | null>(null);

  const ingestMutation = useIngestWord();
  const translateMutation = useTranslateWord();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleTranslate() {
    const direction = lastEdited ?? (enWord ? "en" : heWord ? "he" : null);
    if (!direction) return;
    if (direction === "en" && enWord) {
      translateMutation.mutate(
        { word: enWord, sourceLang: "en", targetLang: "he" },
        { onSuccess: (data) => setHeWord(data.translated) },
      );
    } else if (direction === "he" && heWord) {
      translateMutation.mutate(
        { word: heWord, sourceLang: "he", targetLang: "en" },
        { onSuccess: (data) => setEnWord(data.translated) },
      );
    }
  }

  function handleAddToLibrary() {
    if (!enWord.trim()) {
      setErrorMessage("יש להזין מילה באנגלית לפני ההוספה לספרייה.");
      return;
    }
    ingestMutation.mutate(
      { word: enWord.trim(), source: "manual" },
      {
        onSuccess: () => {
          setHeWord("");
          setEnWord("");
          setLastEdited(null);
          onClose();
        },
      },
    );
  }

  function handleGoToCapture() {
    if (!enWord.trim()) {
      setErrorMessage("יש להזין מילה באנגלית כדי לראות דוגמאות.");
      return;
    }
    navigate(`/capture?word=${encodeURIComponent(enWord.trim())}`);
    onClose();
  }

  const canTranslate =
    !translateMutation.isPending &&
    ((lastEdited === "en" && !!enWord) ||
      (lastEdited === "he" && !!heWord) ||
      (!lastEdited && (!!enWord || !!heWord)));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>הוספת מילה</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="סגור">✕</button>
        </div>
        <p className="subtitle">
          הזן מילה בעברית או באנגלית ולחץ תרגם — לאחר מכן שמור לספרייה או ראה דוגמאות.
        </p>

        <div className="dual-fields">
          <div className="input-group">
            <label>עברית 🇮🇱</label>
            <input
              type="text"
              value={heWord}
              dir="rtl"
              placeholder="למשל: חוסן"
              autoFocus
              onChange={(e) => { setHeWord(e.target.value); setLastEdited("he"); }}
            />
          </div>

          <button
            className="btn-translate-arrow"
            type="button"
            onClick={handleTranslate}
            disabled={!canTranslate}
            title="תרגם"
          >
            {translateMutation.isPending ? "⏳ מתרגם..." : "🔄 תרגם"}
          </button>

          <div className="input-group">
            <label>English 🇬🇧</label>
            <input
              type="text"
              value={enWord}
              dir="ltr"
              placeholder="e.g. resilience"
              onChange={(e) => { setEnWord(e.target.value); setLastEdited("en"); }}
            />
          </div>
        </div>

        <div className="dual-actions">
          <button
            className="btn-success"
            type="button"
            onClick={handleAddToLibrary}
            disabled={!enWord.trim() || ingestMutation.isPending}
          >
            {ingestMutation.isPending ? "שומר..." : "✅ הוסף לספרייה"}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={handleGoToCapture}
            disabled={!enWord.trim()}
          >
            📖 דוגמאות לשימוש
          </button>
        </div>
      </div>
    </div>
  );
}
