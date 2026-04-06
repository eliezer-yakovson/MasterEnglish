function AdminView({ overview, search, setSearch, users, systemWords, systemWordsSearch, setSystemWordsSearch, onDedup, onRefresh, onAction, onDelete, busyKey }) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>ניהול המערכת</h2>
        <button className="btn-secondary" onClick={onRefresh} disabled={busyKey.startsWith('admin-refresh')}>רענן נתונים</button>
      </div>

      {overview ? (
        <>
          <div className="stats-row">
            <MetricCard label="משתמשים רשומים" value={overview.total_users} color="red" />
            <MetricCard label="פעילים שבוע אחרון" value={overview.active_users} color="green" />
            <MetricCard label="סה״כ מילים אצל יוזרים" value={overview.total_words_in_system} color="orange" />
          </div>

          <div className="segmented-control" style={{ maxWidth: '400px', marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>משתמשים</button>
            <button className={activeTab === 'words' ? 'active' : ''} onClick={() => setActiveTab('words')}>מאגר מילים ({systemWords?.total || 0})</button>
          </div>

          {activeTab === 'users' && (
            <div className="content-card full-width">
              <h3>רשימת משתמשים</h3>
              <div className="input-group">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש משתמש (שם, אימייל)..." />
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
                    {users.map(u => (
                      <tr key={u.user_id} className={u.status === 'inactive' ? 'row-inactive' : ''}>
                        <td>
                          <strong>{u.name}</strong><br/>
                          <span className="dim-text">{u.email}</span>
                        </td>
                        <td>
                          <span className={"status-pill " + u.status}>{u.status}</span>
                        </td>
                        <td>
                          <span className={"role-pill " + u.role}>{u.role}</span>
                        </td>
                        <td className="dim-text">
                          {u.words_count} מילים<br/>
                          ציון: {u.progress_score}
                        </td>
                        <td className="actions-cell">
                          {u.status === 'active' ? (
                            <button className="btn-action danger" onClick={() => onAction(u, 'deactivate')} disabled={busyKey === 'admin-deactivate-' + u.user_id}>השבת</button>
                          ) : (
                            <button className="btn-action success" onClick={() => onAction(u, 'activate')} disabled={busyKey === 'admin-activate-' + u.user_id}>הפעל</button>
                          )}
                          <button className="btn-action secondary" onClick={() => onAction(u, 'change_role', u.role === 'admin' ? 'user' : 'admin')} disabled={busyKey === 'admin-change_role-' + u.user_id}>
                            שנה הרשאה
                          </button>
                          <button className="btn-action danger-outline" onClick={() => onDelete(u)} disabled={busyKey === 'admin-delete-' + u.user_id}>מחק</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'words' && (
            <div className="content-card full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>מאגר מילים גלובלי</h3>
                <button className="btn-action danger" onClick={onDedup} disabled={busyKey === 'admin-dedup'}>
                  {busyKey === 'admin-dedup' ? 'בודק...' : 'בדיקת וניקוי כפילויות במאגר'}
                </button>
              </div>

              <div className="input-group">
                <input type="text" value={systemWordsSearch} onChange={(e) => setSystemWordsSearch(e.target.value)} placeholder="חפש מילה או תרגום במאגר..." />
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>מילה (English)</th>
                      <th>תרגום (Hebrew)</th>
                      <th>רמה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(systemWords?.items || []).map((w, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{w.word}</strong>
                        </td>
                        <td>{w.translation}</td>
                        <td>
                          <span className="difficulty-badge">{w.difficulty}</span>
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