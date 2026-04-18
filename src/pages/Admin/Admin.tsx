import { useDeferredValue, useMemo, useState } from "react";
import {
  useAdminOverview,
  useSystemWords,
  useAdminAction,
  useAdminDeleteUser,
  useDedupSystemWords,
  useUpdateSystemWord,
  useDeleteSystemWord,
  useAdminUserLibrary,
} from "../../hooks/useQueries";
import { useAppStore } from "../../store";
import MetricCard from "../../components/MetricCard";
import type { AdminUser } from "../../types";

export default function Admin() {
  const session = useAppStore((s) => s.session);

  const [activeTab, setActiveTab] = useState<"users" | "words">("users");
  const [adminSearch, setAdminSearch] = useState("");
  const [systemWordsSearch, setSystemWordsSearch] = useState("");
  const deferredWordsSearch = useDeferredValue(systemWordsSearch);

  // system word editing
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editingTranslation, setEditingTranslation] = useState("");

  // admin user library view
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserName, setViewingUserName] = useState("");

  const { data: adminOverview, isLoading, refetch } = useAdminOverview();
  const { data: systemWords, refetch: refetchWords } = useSystemWords(deferredWordsSearch);
  const { data: userLibrary, isLoading: libraryLoading } = useAdminUserLibrary(viewingUserId ?? "");
  const adminActionMutation = useAdminAction();
  const deleteUserMutation = useAdminDeleteUser();
  const dedupMutation = useDedupSystemWords();
  const updateSystemWordMutation = useUpdateSystemWord();
  const deleteSystemWordMutation = useDeleteSystemWord();

  const filteredUsers = useMemo(() => {
    const users = adminOverview?.users || [];
    const term = adminSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u: AdminUser) =>
      [u.name, u.email, u.user_id, u.role, u.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [adminOverview, adminSearch]);

  function handleRefresh() {
    void refetch();
    void refetchWords();
  }

  function handleAdminAction(targetUser: AdminUser, actionType: string, newRole?: string) {
    if (!session?.user_id) return;
    const body: {
      admin_id: string;
      action_type: string;
      target_user_id: string;
      new_role?: string;
    } = {
      admin_id: session.user_id,
      action_type: actionType,
      target_user_id: targetUser.user_id,
    };
    if (newRole) body.new_role = newRole;
    adminActionMutation.mutate({ targetUserId: targetUser.user_id, body });
  }

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>ניהול המערכת</h2>
        <button
          className="btn-secondary"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          רענן נתונים
        </button>
      </div>

      {adminOverview ? (
        <>
          <div className="stats-row">
            <MetricCard label="משתמשים רשומים" value={adminOverview.total_users} color="red" />
            <MetricCard label="פעילים שבוע אחרון" value={adminOverview.active_users} color="green" />
            <MetricCard
              label="סה״כ מילים אצל יוזרים"
              value={adminOverview.total_words_in_system}
              color="orange"
            />
          </div>

          <div
            className="segmented-control"
            style={{ maxWidth: "400px", marginBottom: "1.5rem", alignSelf: "flex-start" }}
          >
            <button
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              משתמשים
            </button>
            <button
              className={activeTab === "words" ? "active" : ""}
              onClick={() => setActiveTab("words")}
            >
              מאגר מילים ({systemWords?.total || 0})
            </button>
          </div>

          {activeTab === "users" && (
            <div className="content-card full-width">
              <h3>רשימת משתמשים</h3>
              <div className="input-group">
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="חיפוש משתמש (שם, אימייל)..."
                />
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>שם ואימייל</th>
                      <th>סטטוס</th>
                      <th>הרשאה</th>
                      <th>סטטיסטיקה</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.user_id} className={u.status === "inactive" ? "row-inactive" : ""}>
                        <td>
                          <strong>{u.name}</strong>
                          <br />
                          <span className="dim-text">{u.email}</span>
                        </td>
                        <td>
                          <span className={"status-pill " + u.status}>{u.status}</span>
                        </td>
                        <td>
                          <span className={"role-pill " + u.role}>{u.role}</span>
                        </td>
                        <td className="dim-text">
                          {u.words_count} מילים
                          <br />
                          ציון: {u.progress_score}
                        </td>
                        <td className="actions-cell">
                          {u.status === "active" ? (
                            <button
                              className="btn-action danger"
                              onClick={() => handleAdminAction(u, "deactivate")}
                              disabled={adminActionMutation.isPending}
                            >
                              השבת
                            </button>
                          ) : (
                            <button
                              className="btn-action success"
                              onClick={() => handleAdminAction(u, "activate")}
                              disabled={adminActionMutation.isPending}
                            >
                              הפעל
                            </button>
                          )}
                          <button
                            className="btn-action secondary"
                            onClick={() =>
                              handleAdminAction(
                                u,
                                "change_role",
                                u.role === "admin" ? "user" : "admin",
                              )
                            }
                            disabled={adminActionMutation.isPending}
                          >
                            שנה הרשאה
                          </button>
                          <button
                            className="btn-action secondary"
                            onClick={() => {
                              setViewingUserId(u.user_id);
                              setViewingUserName(u.name);
                            }}
                          >
                            📚 ספרייה
                          </button>
                          <button
                            className="btn-action danger-outline"
                            onClick={() => deleteUserMutation.mutate(u.user_id)}
                            disabled={
                              deleteUserMutation.isPending &&
                              deleteUserMutation.variables === u.user_id
                            }
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── User Library Panel ── */}
          {activeTab === "users" && viewingUserId && (
            <div className="content-card full-width" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>📚 ספריית {viewingUserName}</h3>
                <button className="btn-secondary" onClick={() => setViewingUserId(null)}>סגור ✕</button>
              </div>
              {libraryLoading ? (
                <p>טוען...</p>
              ) : (userLibrary?.items.length ?? 0) === 0 ? (
                <p className="dim-text">אין מילים בספרייה זו.</p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>מילה</th>
                        <th>תרגום</th>
                        <th>רמה</th>
                        <th>שלב</th>
                        <th>ציון</th>
                        <th>חזרה הבאה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(userLibrary?.items ?? []).map((item) => (
                        <tr key={item.word_id}>
                          <td><strong>{item.word}</strong></td>
                          <td>{item.translation}</td>
                          <td><span className="difficulty-badge">{item.difficulty}</span></td>
                          <td>{item.knowledge_stage}</td>
                          <td>{item.score}</td>
                          <td className="dim-text">{item.next_review_date ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "words" && (
            <div className="content-card full-width">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3>מאגר מילים גלובלי</h3>
                <button
                  className="btn-action danger"
                  onClick={() => dedupMutation.mutate()}
                  disabled={dedupMutation.isPending}
                >
                  {dedupMutation.isPending ? "בודק..." : "בדיקת וניקוי כפילויות במאגר"}
                </button>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  value={systemWordsSearch}
                  onChange={(e) => setSystemWordsSearch(e.target.value)}
                  placeholder="חפש מילה או תרגום במאגר..."
                />
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>מילה (English)</th>
                      <th>תרגום (Hebrew)</th>
                      <th>רמה</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(systemWords?.items || []).map((w, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{w.word}</strong>
                        </td>
                        <td>
                          {editingWord === w.word ? (
                            <input
                              type="text"
                              value={editingTranslation}
                              onChange={(e) => setEditingTranslation(e.target.value)}
                              style={{ width: "100%", fontSize: "0.9rem" }}
                              autoFocus
                            />
                          ) : (
                            w.translation
                          )}
                        </td>
                        <td>
                          <span className="difficulty-badge">{w.difficulty}</span>
                        </td>
                        <td className="actions-cell">
                          {editingWord === w.word ? (
                            <>
                              <button
                                className="btn-action success"
                                onClick={() => {
                                  if (editingTranslation.trim()) {
                                    updateSystemWordMutation.mutate({ word: w.word, translation: editingTranslation.trim() });
                                  }
                                  setEditingWord(null);
                                }}
                                disabled={updateSystemWordMutation.isPending}
                              >
                                שמור
                              </button>
                              <button
                                className="btn-action secondary"
                                onClick={() => setEditingWord(null)}
                              >
                                ביטול
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-action secondary"
                                onClick={() => {
                                  setEditingWord(w.word);
                                  setEditingTranslation(w.translation);
                                }}
                              >
                                ✏️ ערוך
                              </button>
                              <button
                                className="btn-action danger-outline"
                                onClick={() => deleteSystemWordMutation.mutate(w.word)}
                                disabled={
                                  deleteSystemWordMutation.isPending &&
                                  deleteSystemWordMutation.variables === w.word
                                }
                              >
                                🗑 מחק
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">אין נתונים להצגה כרגע.</div>
      )}
    </div>
  );
}
