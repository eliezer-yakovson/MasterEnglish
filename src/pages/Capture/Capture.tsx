import { useState } from "react";
import { useEnrichAndCheck, useCaptureWord } from "../../hooks/useQueries";
import type { CaptureForm, CapturePreview } from "../../types";
import SpeakButton from "../../components/SpeakButton";

const initialCaptureForm: CaptureForm = { word: "", context: "", lang: "he" };

export default function Capture() {
  const [captureForm, setCaptureForm] = useState<CaptureForm>(initialCaptureForm);
  const [capturePreview, setCapturePreview] = useState<CapturePreview | null>(null);

  const enrichMutation = useEnrichAndCheck();
  const captureMutation = useCaptureWord();

  function handleCapturePreview(event: React.FormEvent) {
    event.preventDefault();
    enrichMutation.mutate(
      { word: captureForm.word, lang: captureForm.lang },
      { onSuccess: (data) => setCapturePreview(data) },
    );
  }

  function handleCaptureSave() {
    captureMutation.mutate(
      { word: captureForm.word, context: captureForm.context || undefined },
      {
        onSuccess: (result) => {
          setCapturePreview((current) =>
            current
              ? { ...current, duplicate: { exists: true, word_id: result.word_id } }
              : current,
          );
        },
      },
    );
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>לכידת מילים מהירה</h2>
      </div>

      <div className="capture-layout">
        <div className="content-card">
          <h3>איזו מילה פגשתם?</h3>
          <p className="subtitle">
            המערכת תעשיר את המילה אוטומטית עם תרגום, הגדרה ומשפטים.
          </p>

          <form className="simple-form capture-form" onSubmit={handleCapturePreview}>
            <div className="input-group capture-word">
              <input
                type="text"
                value={captureForm.word}
                onChange={(e) => setCaptureForm((c) => ({ ...c, word: e.target.value }))}
                placeholder="Type an English word..."
                required
                autoFocus
              />
            </div>
            <div className="input-group">
              <textarea
                value={captureForm.context}
                onChange={(e) => setCaptureForm((c) => ({ ...c, context: e.target.value }))}
                placeholder="משפט ההקשר, איפה קראתם את זה? מומלץ!"
                rows={2}
              />
            </div>
            <div className="input-group split">
              <label>שפת תרגום:</label>
              <select
                value={captureForm.lang}
                onChange={(e) => setCaptureForm((c) => ({ ...c, lang: e.target.value }))}
              >
                <option value="he">עברית</option>
                <option value="en">אנגלית</option>
              </select>
            </div>
            <button
              className="btn-primary large-action"
              type="submit"
              disabled={enrichMutation.isPending}
            >
              {enrichMutation.isPending ? "מעבד ומעשיר..." : "בדוק והעשר"}
            </button>
          </form>
        </div>

        {capturePreview ? (
          <div className="content-card preview-card">
            <div className="preview-top">
              <h1>{capturePreview.enriched.word}</h1>
              <SpeakButton word={capturePreview.enriched.word} size="lg" />
              <span className="difficulty-badge orange">
                {capturePreview.enriched.difficulty_level}
              </span>
            </div>

            <p className="preview-translation">{capturePreview.enriched.translation}</p>
            <p className="preview-definition">{capturePreview.enriched.definition_he}</p>

            <div className="preview-examples">
              <h4>דוגמאות שימוש</h4>
              <ul>
                {capturePreview.enriched.examples.map((ex, i) => (
                  <li key={i}>
                    <span className="example-en">{ex.en}</span>
                    <span className="example-he">{ex.he}</span>
                  </li>
                ))}
              </ul>
            </div>

            {capturePreview.duplicate.exists ? (
              <div className="notice-box warning">המילה כבר קיימת בספרייה שלכם!</div>
            ) : (
              <button
                className="btn-success large-action mt-4"
                onClick={handleCaptureSave}
                disabled={captureMutation.isPending}
              >
                {captureMutation.isPending ? "שומר..." : "הוסף לספרייה שלי ➕"}
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state-card">הקלידו מילה והמתינו לקסם... ✨</div>
        )}
      </div>
    </div>
  );
}
