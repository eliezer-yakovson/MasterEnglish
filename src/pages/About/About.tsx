import { useNavigate } from "react-router-dom";
import { usePwaInstall } from "../../hooks/usePwaInstall";

const FEATURES = [
  {
    icon: "📚",
    title: "ספריית מילים אישית",
    desc: "כל מילה שתלמד נשמרת בחשבונך עם תרגום, הגדרה ודוגמאות משפטים. הספרייה מסונכרנת בין כל המכשירים.",
  },
  {
    icon: "➕",
    title: "יבוא מילים מרשימה",
    desc: 'הדבק רשימת מילים בפורמט חופשי והמערכת תעבד, תתרגם ותוסיף אותן לספרייה שלך אוטומטית.',
  },
  {
    icon: "🔍",
    title: "לכידת מילה בלחיצה",
    desc: "הקלד כל מילה באנגלית — המערכת מביאה תרגום, רמת קושי, הגדרה ודוגמאות מיידית. שמור למאגר בלחיצה אחת.",
  },
  {
    icon: "🎯",
    title: "תרגול עם זיכרון מרווח",
    desc: "אלגוריתם Spaced Repetition מחשב מתי ללמד כל מילה מחדש — מילים קשות חוזרות בתדירות גבוהה, מילים שמות בהדרגה.",
  },
  {
    icon: "📊",
    title: "מעקב התקדמות",
    desc: "גרפים וסטטיסטיקות המראות כמה מילים למדת, אחוזי הצלחה, ומגמות לאורך זמן.",
  },
  {
    icon: "🎮",
    title: "משחקי למידה",
    desc: "Snake Words — הימנע ממלדודות תוך כדי זיהוי מילים. Speed Match — חבר מילים לתרגומים על הזמן. עוד משחקים בדרך!",
  },
  {
    icon: "🔊",
    title: "הגיית מילים",
    desc: "כפתור הגייה לכל מילה — שמע את ההגייה הנכונה בכל מקום בממשק.",
  },
  {
    icon: "📲",
    title: "עובד כאפליקציה",
    desc: "ניתן להתקין כ-PWA על הטלפון או המחשב — נפתח כאפליקציה ייעודית, עובד מהיר וזמין תמיד.",
  },
];

export default function About() {
  const navigate = useNavigate();
  const { canInstall, triggerInstall, isInstalled } = usePwaInstall();

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="about-hero-icon">🇬🇧</div>
        <h1>Master English</h1>
        <p className="about-tagline">
          מערכת חכמה ללמידת אנגלית — בנויה כדי שתזכור יותר, בפחות זמן
        </p>
        {canInstall && !isInstalled && (
          <button className="btn-primary about-install-btn" onClick={triggerInstall}>
            📲 התקן את האפליקציה
          </button>
        )}
        {isInstalled && (
          <div className="about-installed-badge">✅ האפליקציה מותקנת במכשיר שלך</div>
        )}
      </div>

      <div className="about-section">
        <h2>🎯 המטרה</h2>
        <p className="about-text">
          רוב שיטות הלמידה גורמות לך לשכוח מילים תוך מספר ימים. Master English משתמשת
          בשיטת <strong>Spaced Repetition</strong> — אלגוריתם מדעי שמציג לך כל מילה בדיוק
          ברגע שאתה עומד לשכוח אותה. התוצאה: למידה של פי 3-5 יותר מילים באותו הזמן.
        </p>
      </div>

      <div className="about-section">
        <h2>⚡ פיצ'רים</h2>
        <div className="about-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="about-feature-card">
              <div className="about-feature-icon">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-section">
        <h2>🚀 איך מתחילים?</h2>
        <div className="about-steps">
          {[
            { n: "1", title: 'יבוא מילים', desc: 'לך ל"יבוא מילים" והדבק רשימת מילים שאתה רוצה ללמוד' },
            { n: "2", title: 'סיור בספרייה', desc: 'ראה את המילים שנשמרו עם התרגומים וניתן להשמיע כל מילה' },
            { n: "3", title: 'תרגול יומי', desc: 'כנס לתרגול כל יום — 10-15 דקות מספיקות לחיזוק הזיכרון' },
            { n: "4", title: 'עקוב אחרי ההתקדמות', desc: 'ראה כמה מילים כבר ברמת ידע גבוהה בדף ההתקדמות' },
          ].map((s) => (
            <div key={s.n} className="about-step">
              <div className="about-step-num">{s.n}</div>
              <div>
                <strong>{s.title}</strong>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-cta">
        <button className="btn-primary" style={{ maxWidth: 280 }} onClick={() => navigate("/library")}>
          📚 לספרייה שלי
        </button>
      </div>
    </div>
  );
}
