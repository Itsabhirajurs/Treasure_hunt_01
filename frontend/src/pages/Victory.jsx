import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useGame } from "../context/GameContext";
import { supabase } from "../supabaseClient";

export default function Victory() {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [rank, setRank] = useState(1);
  const [totalTeams, setTotalTeams] = useState(1);
  const [totalTime, setTotalTime] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js";
    script.onload = () => {
      if (window.confetti) {
        window.confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 }, colors: ["#FFD700", "#FFA500", "#FF6347"] });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: mine } = await supabase.from("teams").select("*").eq("id", state.team.id).single();
      const { data: all } = await supabase.from("teams").select("id,total_score");
      const { data: submits } = await supabase.from("submissions").select("time_elapsed_seconds").eq("team_id", state.team.id);

      if (!alive) return;
      setTeam(mine);
      const higher = (all || []).filter((t) => t.total_score > (mine?.total_score || 0)).length;
      setRank(higher + 1);
      setTotalTeams((all || []).length || 1);
      setTotalTime((submits || []).reduce((sum, s) => sum + (s.time_elapsed_seconds || 0), 0));
    }
    load();
    return () => {
      alive = false;
    };
  }, [state.team.id]);

  useEffect(() => {
    if (!team) return;
    const id = setInterval(() => {
      setDisplayScore((v) => {
        if (v >= team.total_score) {
          clearInterval(id);
          return team.total_score;
        }
        return v + 23;
      });
    }, 16);

    return () => clearInterval(id);
  }, [team]);

  const badges = useMemo(() => team?.badges || [], [team]);

  const playAgain = async () => {
    const { data } = await supabase
      .from("teams")
      .update({ current_round: 1, total_score: 0, badges: [], completed: false })
      .eq("id", state.team.id)
      .select("*")
      .single();
    dispatch({ type: "SET_TEAM", payload: data });
    navigate("/hunt");
  };

  if (!team) return <LoadingSpinner label="Loading victory stats" />;

  return (
    <main className="page-shell center-screen victory-screen">
      <div className="chest big-chest" aria-hidden>
        <div className="lid" />
        <div className="base" />
      </div>
      <h1>TREASURE FOUND</h1>
      <h2>{team.name}</h2>
      <p>Final Score: {Math.min(displayScore, team.total_score)}</p>
      <p>Total Time: {totalTime}s</p>
      <p>You finished #{rank} among {totalTeams} crews</p>
      <div className="badge-row">{badges.map((b) => <span key={b} className="badge">{b.slice(0, 1)}</span>)}</div>
      <div className="hero-buttons">
        <button className="gold-button" onClick={() => navigate("/leaderboard")}>VIEW LEADERBOARD</button>
        <button className="crimson-button" onClick={playAgain}>PLAY AGAIN</button>
      </div>
    </main>
  );
}
