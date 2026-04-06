import { useState } from "react";
import { useAppStore } from "../../store";
import { useIngestWord, useBulkIngestWords } from "../../hooks/useQueries";
import type { ManualForm } from "../../types";

const initialManualForm: ManualForm = { word: "", context: "" };

function splitImportWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export default function Import() {
  const setErrorMessage = useAppStore((s) => s.setErrorMessage);
  const [manualForm, setManualForm] = useState<ManualForm>(initialManualForm);
  const [bulkImportText, setBulkImportText] = useState("");
  const [importSummary, setImportSummary] = useState<{
    created: number;
    duplicates: number;
  } | null>(null);

  const ingestMutation = useIngestWord();
  const bulkMutation = useBulkIngestWords();

  function handleManualSave(event: React.FormEvent) {
    event.preventDefault();
    ingestMutation.mutate(
      { word: manualForm.word, source: "manual", context: manualForm.context || undefined },
      { onSuccess: () => setManualForm(initialManualForm) },
    );
  }

  function handleBulkImport(event: React.FormEvent) {
    event.preventDefault();
    const words = splitImportWords(bulkImportText);
    if (!words.length) {
      setErrorMessage("צריך להדביק לפחות מילה אחת לייבוא.");
      return;
    }
    bulkMutation.mutate(
      { lang: "he", words: words.map((w) => ({ word: w })) },
      {
        onSuccess: (result) => {
          setImportSummary(result);
          setBulkImportText("");
        },
      },
    );
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>יבוא מילים</h2>
      </div>

      <div className="cards-grid">
        <div className="content-card">
          <h3>מילה בודדת</h3>
          <p className="subtitle">
            הוסיפו מילה ידנית — המערכת תעשיר אוטומטית עם תרגום והגדרה.
          </p>
          <form className="simple-form" onSubmit={handleManualSave}>
            <div className="input-group">
              <label>מילה באנגלית</label>
              <input
                type="text"
                value={manualForm.word}
                onChange={(e) => setManualForm((c) => ({ ...c, word: e.target.value }))}
                placeholder="למשל: resilient"
                required
              />
            </div>
            <div className="input-group">
              <label>משפט הקשר (אופציונלי)</label>
              <textarea
                value={manualForm.context}
                onChange={(e) => setManualForm((c) => ({ ...c, context: e.target.value }))}
                placeholder="משפט לדוגמה..."
                rows={3}
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={ingestMutation.isPending}
              style={{ marginTop: "0.75rem" }}
            >
              {ingestMutation.isPending ? "מוסיף ומעשיר..." : "הוסף וועשיר מילה"}
            </button>
          </form>
        </div>

        <div className="content-card">
          <h3>ייבוא רשימה</h3>
          <p className="subtitle">
            הדביקו רשימת מילים — כל מילה בשורה נפרדת. המערכת תסנן כפילויות ותעשיר אוטומטית.
          </p>
          <form className="simple-form" onSubmit={handleBulkImport}>
            <div className="input-group">
              <label>מילים לייבוא</label>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder={"apple\nbanana\nresillient\n..."}
                rows={8}
                required
              />
            </div>
            <button
              className="btn-primary"
              type="submit"
              disabled={bulkMutation.isPending}
              style={{ marginTop: "0.75rem" }}
            >
              {bulkMutation.isPending ? "מייבא..." : "ייבא רשימה"}
            </button>
            {importSummary && (
              <div className="import-result">
                ✅ יובאו {importSummary.created} מילים בהצלחה! ({importSummary.duplicates}{" "}
                כפילויות).
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
