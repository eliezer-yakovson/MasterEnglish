import { useDeferredValue, useState } from "react";
import { useLibrary, useDeleteWord, useUpdateWord } from "../../hooks/useQueries";
import type { LibraryItem } from "../../types";
import SpeakButton from "../../components/SpeakButton";

interface ScheduleForm {
  knowledge_stage: string;
  next_review_date: string;
}

export default function Library() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    knowledge_stage: "",
    next_review_date: "",
  });

  const { data: library, isLoading, refetch } = useLibrary(deferredSearch);
  const deleteMutation = useDeleteWord();
  const updateMutation = useUpdateWord();

  function openSchedule(item: LibraryItem) {
    setExpandedWordId(item.word_id);
    setScheduleForm({
      knowledge_stage: String(item.knowledge_stage),
      next_review_date: item.next_review_date || "",
    });
  }

  function handleScheduleSubmit(e: React.FormEvent, wordId: string) {
    e.preventDefault();
    const body: { knowledge_stage?: number; next_review_date?: string } = {};
    if (scheduleForm.knowledge_stage !== "")
      body.knowledge_stage = Number(scheduleForm.knowledge_stage);
    if (scheduleForm.next_review_date) body.next_review_date = scheduleForm.next_review_date;
    updateMutation.mutate({ wordId, body });
    setExpandedWordId(null);
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>ספריית המילים שלי</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="library-count">{library?.total ?? 0} פריטים</span>
          <button
            className="btn-secondary"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            רענון
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="input-group">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש מילה או תרגום..."
          />
        </div>

        <div className="library-grid">
          {(library?.items ?? []).map((item) => (
            <div className="library-card" key={item.word_id}>
              <div className="card-top">
                <strong className="word-title">{item.word}</strong>
                <SpeakButton word={item.word} size="sm" />
                <span className="difficulty-badge">{item.difficulty}</span>
              </div>
              <p className="word-translation">{item.translation}</p>
              <div className="word-stats">
                <span>שלב {item.knowledge_stage}</span>
                <span>ציון {item.score}</span>
              </div>

              <div className="card-actions" style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  className="btn-icon"
                  title="קבע תאריך חזרה"
                  onClick={() =>
                    expandedWordId === item.word_id
                      ? setExpandedWordId(null)
                      : openSchedule(item)
                  }
                  disabled={
                    updateMutation.isPending &&
                    (updateMutation.variables as { wordId: string } | undefined)?.wordId === item.word_id
                  }
                >
                  📅
                </button>
                <button
                  className="btn-icon btn-icon--danger"
                  title="מחק מילה"
                  onClick={() => deleteMutation.mutate(item.word_id)}
                  disabled={
                    deleteMutation.isPending && deleteMutation.variables === item.word_id
                  }
                >
                  {deleteMutation.isPending && deleteMutation.variables === item.word_id
                    ? "..."
                    : "🗑"}
                </button>
              </div>

              {expandedWordId === item.word_id && (
                <form
                  className="schedule-form"
                  onSubmit={(e) => handleScheduleSubmit(e, item.word_id)}
                  style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}
                >
                  <label style={{ fontSize: "0.8rem" }}>
                    שלב ידע (0–5)
                    <select
                      value={scheduleForm.knowledge_stage}
                      onChange={(e) =>
                        setScheduleForm((f) => ({ ...f, knowledge_stage: e.target.value }))
                      }
                      style={{ marginRight: "0.4rem" }}
                    >
                      <option value="">ללא שינוי</option>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: "0.8rem" }}>
                    תאריך חזרה הבא
                    <input
                      type="date"
                      value={scheduleForm.next_review_date}
                      onChange={(e) =>
                        setScheduleForm((f) => ({ ...f, next_review_date: e.target.value }))
                      }
                      style={{ marginRight: "0.4rem" }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className="btn-primary"
                      type="submit"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                    >
                      שמור
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                      onClick={() => setExpandedWordId(null)}
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
