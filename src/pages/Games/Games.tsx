import { useNavigate } from "react-router-dom";

interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  available: boolean;
}

const GAMES: GameCard[] = [
  {
    id: "snake",
    title: "Snake Words",
    description: "נווט את הנחש ואכול את המילה הנכונה לפי הפירוש בעברית. מילה שגויה — משחק נגמר!",
    icon: "🐍",
    path: "/games/snake",
    available: true,
  },
  {
    id: "speedmatch",
    title: "Speed Match",
    description: "חבר כל מילה אנגלית לתרגום שלה כמה שיותר מהר! כל הצלחה מעלה את שלב הידע.",
    icon: "⚡",
    path: "/games/speedmatch",
    available: true,
  },
  {
    id: "coming-soon-1",
    title: "Speed Typing",
    description: "בקרוב...",
    icon: "⌨️",
    path: "",
    available: false,
  },
];

export default function Games() {
  const navigate = useNavigate();

  return (
    <div className="view-grid">
      <div className="view-header">
        <h2>🎮 משחקים</h2>
        <span className="library-count">למד אנגלית דרך משחק</span>
      </div>

      <div className="games-hub-grid">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={`game-hub-card${game.available ? "" : " disabled"}`}
            onClick={() => game.available && navigate(game.path)}
            title={game.available ? `שחק ${game.title}` : "בקרוב..."}
          >
            <div className="game-hub-icon">{game.icon}</div>
            <div className="game-hub-info">
              <h3>{game.title}</h3>
              <p>{game.description}</p>
            </div>
            {game.available && <span className="game-hub-play">שחק ▶</span>}
            {!game.available && <span className="game-hub-soon">בקרוב</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
