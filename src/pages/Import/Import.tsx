import { useState } from "react";
import { useAppStore } from "../../store";
import { useBulkIngestWords } from "../../hooks/useQueries";

function splitImportWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default function Import() {
  const setErrorMessage = useAppStore((s) => s.setErrorMessage);
  const [bulkImportText, setBulkImportText] = useState("");
  const [importSummary, setImportSummary] = useState<{ created: number; duplicates: number } | null>(null);
  const [inputLang, setInputLang] = useState<"en" | "he">("en");
  const bulkMutation = useBulkIngestWords();

  function handleBulkImport(event: React.FormEvent) {
    event.preventDefault();
    const words = splitImportWords(bulkImportText);
    if (!words.length) {
      setErrorMessage("צריך להדביק לפחות מילה אחת לייבוא.");
      return;
    }
    bulkMutation.mutate(
      { lang: "he", input_lang: inputLang, words: words.map((w) => ({ word: w })) },
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
          <h3>ייבוא רשימה</h3>
          <p className="subtitle">
            הדביקו רשימת מילים — כל מילה בשורה נפרדת. המערכת תסנן כפילויות ותעשיר אוטומטית.
          </p>
          <form className="simple-form" onSubmit={handleBulkImport}>
            <div className="lang-input-selector">
              <p className="lang-input-selector-label">שפת הקלט — באיזו שפה המילים שתדביקו?</p>
              <div className="direction-options">
                <button
                  type="button"
                  className={`direction-btn${inputLang === "en" ? " active" : ""}`}
                  onClick={() => setInputLang("en")}
                >
                  <span className="dir-langs">English</span>
                  <span className="dir-hint">מילים באנגלית, נשמרות ישירות</span>
                </button>
                <button
                  type="button"
                  className={`direction-btn${inputLang === "he" ? " active" : ""}`}
                  onClick={() => setInputLang("he")}
                >
                  <span className="dir-langs">עברית</span>
                  <span className="dir-hint">מתורגמות אוטומטית לאנגלית לפני השמירה</span>
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>מילים לייבוא</label>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder={inputLang === "he" ? "חזק\nמהיר\nחכם\n..." : "apple\nbanana\nresillient\n..."}
                rows={8}
                dir={inputLang === "he" ? "rtl" : "ltr"}
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
                ✅ יובאו {importSummary.created} מילים בהצלחה! ({importSummary.duplicates} כפילויות).
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
