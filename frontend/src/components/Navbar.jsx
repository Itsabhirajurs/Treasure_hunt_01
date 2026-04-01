import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function Navbar() {
  const { state, dispatch } = useGame();
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/") return null;

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/register");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">OJAS 2026</Link>
      <div className="nav-center">{state.team?.name ? `Crew: ${state.team.name}` : "Guest Sailor"}</div>
      <div className="nav-right">
        <span>Score: {state.score}</span>
        <Link to="/leaderboard">Leaderboard</Link>
        {state.team && (
          <button className="crimson-button" onClick={logout}>
            Abandon Ship
          </button>
        )}
      </div>
    </nav>
  );
}
